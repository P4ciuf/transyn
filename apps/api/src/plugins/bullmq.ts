import { Queue, type JobsOptions } from "bullmq";
import { RedisPlugin } from "./redis.js";
import { logger } from "../utils/logger.js";

/**
 * Payload pushed onto the translation queue when a client requests a
 * translation.  Mirrors the shape expected by the Python worker.
 *
 * @property id - UUID v4 job identifier shared between API and worker.
 * @property text - Source text to translate.
 * @property targetLang - M2M100 language code for the target language.
 * @property sourceLang - Optional M2M100 language code for the source
 *                        language; when omitted the worker infers it.
 */
export interface TranslationJobData {
  id: string;
  text: string;
  targetLang: string;
  sourceLang?: string;
}

/**
 * Result written to Redis by the Python worker after a translation
 * completes.  Consumed by {@link QueuePlugin.waitForResult}.
 *
 * @property translatedText - The translated output string.
 * @property sourceLang - Language of the original text (detected or
 *                        explicit).
 * @property targetLang - Language the text was translated into.
 */
export interface TranslationResult {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

/**
 * Snapshot of the BullMQ translation queue gathered by
 * {@link QueuePlugin.getStats}.
 */
export interface QueueStats {
  waiting: number;
  active: number;
  completed: number;
  failed: number;
}

/** BullMQ queue name shared with the Python worker. */
const QUEUE_NAME = "translate";
/** Redis list key where jobs are pushed for the worker's BRPOP. */
const JOB_LIST_KEY = "transyn:jobs";
/** Redis key prefix under which the worker stores completed results. */
const RESULT_KEY_PREFIX = "transyn:result:";
/** Milliseconds between Redis polls in {@link QueuePlugin.waitForResult}. */
const DEFAULT_POLL_INTERVAL_MS = 100;
/** Default timeout in milliseconds for {@link QueuePlugin.waitForResult}. */
const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * BullMQ-backed queue plugin for asynchronous translation jobs.
 *
 * Each translation is submitted as a BullMQ job and simultaneously pushed
 * onto a Redis list consumed by the Python M2M100 worker.  The caller polls
 * for the result via {@link waitForResult}.
 *
 * @example
 * ```ts
 * const queue = await QueuePlugin.init();
 * const { id } = await queue.submitTranslation("Hello", "fr", "en");
 * const result = await queue.waitForResult(id);
 * ```
 */
export class QueuePlugin {
  /**
   * @param queue - BullMQ Queue instance.
   * @param redisPlugin - RedisPlugin for direct Redis operations (LPUSH,
   *                      GET, DEL).
   * @private
   */
  private constructor(
    private readonly queue: Queue,
    private readonly redisPlugin: RedisPlugin,
  ) {}

  /**
   * Initialises the BullMQ queue and returns a ready-to-use QueuePlugin
   * instance.  Must be called once before any other method.
   *
   * @returns A QueuePlugin connected to Redis.
   * @async
   */
  public static async init(): Promise<QueuePlugin> {
    const redisPlugin = await RedisPlugin.Instance();
    const redis = await redisPlugin.getClient();
    const queue = new Queue(QUEUE_NAME, { connection: redis });

    logger.info(`BullMQ queue "${QUEUE_NAME}" initialised`, { customPrefix: "bullmq" });

    return new QueuePlugin(queue, redisPlugin);
  }

  /**
   * Enqueues a translation job in both BullMQ and the Redis worker list.
   *
   * The job is written to the Redis list first (so the Python worker can
   * BRPOP it), then added to BullMQ for monitoring and stats.
   *
   * @param text - Source text to translate.
   * @param targetLang - M2M100 target language code.
   * @param sourceLang - Optional M2M100 source language code.
   * @returns The job data including the generated UUID.
   * @async
   */
  public async submitTranslation(
    text: string,
    targetLang: string,
    sourceLang?: string,
  ): Promise<TranslationJobData> {
    const id = crypto.randomUUID();
    const jobData: TranslationJobData = { id, text, targetLang, sourceLang };

    // LPUSH onto the worker's Redis list before adding to BullMQ so the
    // worker can begin processing immediately.
    const redis = await this.redisPlugin.getClient();
    await redis.lpush(JOB_LIST_KEY, JSON.stringify(jobData));

    const jobOptions: JobsOptions = {
      jobId: id,
      removeOnComplete: { age: 3600 },
      removeOnFail: { age: 86400 },
    };

    await this.queue.add(QUEUE_NAME, jobData, jobOptions);

    logger.debug(`Translation job enqueued`, {
      customPrefix: "bullmq",
      meta: { jobId: id, targetLang },
    });

    return jobData;
  }

  /**
   * Polls Redis for a completed translation result until it arrives or the
   * timeout is reached.  The result key is atomically deleted after a
   * successful read to avoid re-processing.
   *
   * @param jobId - UUID returned by {@link submitTranslation}.
   * @param timeoutMs - Maximum time to wait (default 30 s).
   * @returns The translation result, or `null` if the timeout expires.
   * @async
   */
  public async waitForResult(
    jobId: string,
    timeoutMs = DEFAULT_TIMEOUT_MS,
  ): Promise<TranslationResult | null> {
    const redis = await this.redisPlugin.getClient();
    const resultKey = `${RESULT_KEY_PREFIX}${jobId}`;
    const start = Date.now();

    while (Date.now() - start < timeoutMs) {
      const raw = await redis.get(resultKey);
      if (raw) {
        // Atomically consume the result so it cannot be fetched twice.
        await redis.del(resultKey);
        return JSON.parse(raw) as TranslationResult;
      }
      await new Promise((resolve) => setTimeout(resolve, DEFAULT_POLL_INTERVAL_MS));
    }

    logger.warn(`Translation job timed out`, {
      customPrefix: "bullmq",
      meta: { jobId, timeoutMs },
    });

    return null;
  }

  /**
   * Returns a snapshot of the translation queue statistics (waiting,
   * active, completed, failed counts).
   *
   * @returns Queue statistics across all job states.
   * @async
   */
  public async getStats(): Promise<QueueStats> {
    const [waiting, active, completed, failed] = await Promise.all([
      this.queue.getWaitingCount(),
      this.queue.getActiveCount(),
      this.queue.getCompletedCount(),
      this.queue.getFailedCount(),
    ]);

    return {
      waiting,
      active,
      completed,
      failed,
    };
  }

  /**
   * Gracefully closes the BullMQ queue connection.  Call during
   * application shutdown.
   *
   * @async
   */
  public async close(): Promise<void> {
    await this.queue.close();
    logger.info("BullMQ queue closed", { customPrefix: "bullmq" });
  }
}
