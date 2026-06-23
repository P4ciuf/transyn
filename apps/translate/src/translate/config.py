"""Application settings loaded from environment variables.

Uses pydantic-settings (:class:`BaseSettings`) to populate values from
process environment or a ``.env`` file.  All keys are case-insensitive
and have no prefix, making them easy to set in Docker Compose or
Kubernetes manifests.
"""

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Runtime configuration for the translation worker.

    Every field maps to an environment variable of the same name with a
    sensible default.  Integer values are automatically coerced from
    strings.  See :attr:`model_config` for naming conventions.

    Example:
        >>> import os
        >>> os.environ["REDIS_URL"] = "redis://custom:6379"
        >>> settings = Settings()
        >>> settings.redis_url
        'redis://custom:6379'
    """

    model_config = {
        "env_prefix": "",            # env var names match field names exactly
        "case_sensitive": False,     # REDIS_URL and redis_url are equivalent
    }

    redis_url: str = "redis://localhost:6379"
    """Redis server URL passed to :func:`redis.from_url`."""

    model_name: str = "facebook/m2m100_418M"
    """HuggingFace model identifier for :class:`M2M100ForConditionalGeneration`."""

    quantization: str | None = None
    """When ``"int8"``, applies bitsandbytes INT8 quantisation at load time."""

    log_level: str = "INFO"
    """Python logging level (DEBUG, INFO, WARNING, ERROR)."""

    max_input_length: int = 512
    """Maximum number of source tokens fed to the tokenizer (truncation)."""

    job_list_key: str = "transyn:jobs"
    """Redis list key the worker BRPOPs for incoming translation jobs."""

    result_key_prefix: str = "transyn:result:"
    """Prefix prepended to job IDs when storing results in Redis."""

    result_ttl_seconds: int = 3600
    """TTL (in seconds) for result keys stored in Redis."""

    poll_timeout_seconds: int = 5
    """BRPOP timeout — how long the worker blocks waiting for new jobs."""
