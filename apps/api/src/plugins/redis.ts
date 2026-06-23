import { Redis } from "ioredis";
import { EnvUtils } from "../utils/env.js";
import { logger } from "../utils/logger.js";

/**
 * Singleton wrapper around an ioredis Redis client.
 *
 * Provides a lazily-initialised connection with event logging, plus
 * convenience wrappers for common Redis commands used across the
 * application.
 *
 * @example
 * ```ts
 * const plugin = await RedisPlugin.Instance();
 * await plugin.set("key", "value");
 * const value = await plugin.get("key");
 * ```
 */
export class RedisPlugin {
  private readonly client: Redis;

  /**
   * @param client - Underlying ioredis Redis instance
   * @private
   */
  private constructor(client: Redis) {
    this.client = client;
  }

  /**
   * Returns the singleton RedisPlugin, creating the connection on first
   * call.  Registers `connect` and `error` event handlers for logging.
   *
   * @returns The initialised RedisPlugin instance.
   * @async
   */
  public static async Instance(): Promise<RedisPlugin> {
    const redis = new Redis(EnvUtils.variables.REDIS_URL);

    redis.on("connect", () => {
      logger.info(`Connected`, { customPrefix: "redis" });
    });

    // Redis connection errors are often transient (network flaps,
    // reconnect cycles) and ioredis handles reconnection internally.
    // Logging at info avoids polluting the error channel with recoverable
    // events.
    redis.on("error", (error) => {
      logger.info(`Connection error: ${error}`, { customPrefix: "redis" });
    });

    return new RedisPlugin(redis);
  }

  /**
   * Returns the underlying ioredis client for direct use when the
   * convenience wrappers are insufficient.
   *
   * @returns The ioredis Redis client instance.
   * @async
   */
  public async getClient(): Promise<Redis> {
    return this.client;
  }

  /**
   * Gracefully closes the connection via `QUIT`.
   *
   * @returns The reply string from the Redis server (typically "OK").
   * @async
   */
  public async closeClient(): Promise<string> {
    return this.client.quit();
  }

  /**
   * Forcefully disconnects the client without waiting for pending replies.
   *
   * @returns A promise that resolves when the connection is torn down.
   * @async
   */
  public async disconnect(): Promise<void> {
    return this.client.disconnect();
  }

  /**
   * Sends a PING command to verify connectivity.
   *
   * @returns "PONG" if the server is reachable.
   * @async
   */
  public async ping(): Promise<string> {
    return this.client.ping();
  }

  /**
   * Retrieves the value stored at `key`.
   *
   * @param key - Redis key.
   * @returns The stored string value, or `null` if the key does not exist.
   * @async
   */
  public async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  /**
   * Sets a string value for the given key.
   *
   * @param key - Redis key.
   * @param value - String value to store.
   * @returns "OK" on success.
   * @async
   */
  public async set(key: string, value: string): Promise<string> {
    return this.client.set(key, value);
  }

  /**
   * Deletes a key.
   *
   * @param key - Redis key to remove.
   * @returns Number of keys that were deleted (0 or 1).
   * @async
   */
  public async del(key: string): Promise<number> {
    return this.client.del(key);
  }

  /**
   * Checks whether a key exists.
   *
   * @param key - Redis key.
   * @returns 1 if the key exists, 0 otherwise.
   * @async
   */
  public async exists(key: string): Promise<number> {
    return this.client.exists(key);
  }

  /**
   * Finds all keys matching the given glob pattern.
   *
   * **Caution:** `KEYS` blocks the Redis server while scanning.  Avoid
   * using this on large datasets in production — prefer `SCAN` instead.
   *
   * @param pattern - Glob-style pattern (e.g. `"transyn:*"`).
   * @returns Array of matching key names.
   * @async
   */
  public async keys(pattern: string): Promise<string[]> {
    return this.client.keys(pattern);
  }
}
