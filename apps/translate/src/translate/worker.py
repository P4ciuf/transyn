"""Redis-backed worker that consumes translation jobs and writes results.

The worker is designed to run as a long-lived process (typically inside
a Docker container).  It connects to Redis once, loads the M2M100 model
once, and then enters a blocking BRPOP loop that processes jobs until
a SIGINT or SIGTERM signal is received.
"""

import json
import logging
import signal
import sys
from typing import Any

import redis

from translate.config import Settings
from translate.model import TranslationModel

logger = logging.getLogger(__name__)

# Module-level flag toggled by the signal handler to break the main loop.
running = True


def _setup_logging(level: str) -> None:
    """Configure the root logger to write timestamped messages to stdout.

    Args:
        level: Python log level name (e.g. ``"DEBUG"``, ``"INFO"``).
            Falls back to ``logging.INFO`` if the name is invalid.
    """
    logging.basicConfig(
        level=getattr(logging, level.upper(), logging.INFO),
        format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
        stream=sys.stdout,
    )


def _shutdown(signum: int, frame: Any) -> None:
    """Signal handler that sets :data:`running` to ``False``.

    Registered for SIGINT and SIGTERM so the worker can finish its
    current iteration before exiting cleanly.

    Args:
        signum: The signal number that triggered the handler.
        frame: The current stack frame (unused).
    """
    global running
    logger.info("Received signal %s, shutting down ...", signum)
    running = False


def main() -> None:
    """Entry point for the translation worker process.

    Workflow:
    1. Load settings from the environment.
    2. Configure logging.
    3. Register SIGINT / SIGTERM handlers.
    4. Connect to Redis and load the M2M100 model (both once at startup).
    5. Enter a blocking BRPOP loop:
       a. Wait for a job on the configured Redis list.
       b. Validate the JSON payload and required fields.
       c. Run translation via :meth:`TranslationModel.translate`.
       d. Write the result back to Redis with a TTL.
    6. Exit when the :data:`running` flag becomes ``False``.
    """
    settings = Settings()  # type: ignore[call-arg]  # pydantic-settings 2.x init signature
    _setup_logging(settings.log_level)

    signal.signal(signal.SIGINT, _shutdown)
    signal.signal(signal.SIGTERM, _shutdown)

    logger.info("Connecting to Redis at %s", settings.redis_url)
    conn = redis.from_url(settings.redis_url)

    # Model is loaded eagerly at startup (not lazily on first job) so
    # the first translation doesn't incur a multi-second cold-start delay.
    model = TranslationModel(settings.model_name, settings.quantization)

    logger.info("Worker started, waiting for jobs on %s", settings.job_list_key)

    while running:
        try:
            # BRPOP returns a (key, value) tuple on success, None on timeout.
            result = conn.brpop(settings.job_list_key, timeout=settings.poll_timeout_seconds)
        except (redis.ConnectionError, redis.TimeoutError) as exc:
            logger.error("Redis connection error: %s", exc)
            continue

        if result is None:
            continue

        # Unpack the (key, value) tuple returned by BRPOP.
        _, raw = result
        try:
            job = json.loads(raw)
        except json.JSONDecodeError as exc:
            logger.warning("Invalid job payload: %s", exc)
            continue

        job_id = job.get("id")
        text = job.get("text")
        target_lang = job.get("targetLang")
        source_lang = job.get("sourceLang")

        # Require at minimum id, text, and target_lang to proceed.
        if not job_id or not text or not target_lang:
            logger.warning("Skipping incomplete job: %s", job)
            continue

        logger.info("Processing job %s: %s -> %s", job_id, source_lang or "auto", target_lang)

        try:
            translation = model.translate(text, target_lang, source_lang)
        except Exception as exc:
            logger.error("Translation failed for job %s: %s", job_id, exc)
            continue

        result_key = f"{settings.result_key_prefix}{job_id}"
        try:
            # Store the result with a TTL so stale entries expire
            # automatically and don't accumulate indefinitely.
            conn.set(result_key, json.dumps(translation), ex=settings.result_ttl_seconds)
            logger.info("Job %s completed", job_id)
        except (redis.ConnectionError, redis.TimeoutError) as exc:
            logger.error("Failed to store result for job %s: %s", job_id, exc)

    logger.info("Worker stopped")


if __name__ == "__main__":
    main()
