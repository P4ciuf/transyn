import dotenv from "dotenv";
import { logger } from "./logger.js";
// dotenv must be loaded before any static accessor reads process.env.
dotenv.config();

/**
 * Static helper for accessing and validating environment variables.
 *
 * Loads dotenv on import, provides type-safe accessors with default values,
 * and fails fast at startup if any required variable is missing.
 *
 * @example
 * ```ts
 * // Access a validated variable with a default fallback
 * const port = EnvUtils.variables.PORT;
 * ```
 */
export class EnvUtils {
  /**
   * Validates that a raw environment value is a non-empty string, number, or boolean.
   *
   * @private
   * @param value - The raw value from process.env
   * @returns The JavaScript typeof string of the value
   * @throws If the value is missing or of an unsupported type
   */
  private static checkValue(value: unknown): string {
    const valueType = typeof value;
    if (
      !valueType.length ||
      (valueType !== "string" && valueType !== "number" && valueType !== "boolean")
    ) {
      throw new Error("Missing environment variable");
    }
    return valueType;
  }

  /**
   * Reads an environment variable with optional fallback to undefined.
   *
   * @param key      - The environment variable name
   * @param required - When true, throws if the variable is missing or invalid
   * @returns The value cast to T, or undefined when not required and missing
   * @throws When required is true and the variable is absent or of an unsupported type
   */
  private static get<T>(key: string, required: true): T;
  private static get<T>(key: string, required?: false): T | undefined;
  private static get<T>(key: string, required = false): T | undefined {
    const value: unknown = process.env[key];
    try {
      EnvUtils.checkValue(value);
    } catch {
      if (!required) {
        return undefined;
      }
      throw new Error(`${key} is missing from environment variables`);
    }
    return value as T;
  }

  /**
   * Validates all environment variables the application depends on.
   *
   * Called once at import time in {@link app.ts}; exits the process with
   * code 1 if any required variable is missing.
   *
   * Required (must be set): `REDIS_URL` (string).<br>
   * Optional with defaults: `PORT`, `RATE_LIMIT_MAX`,
   * `RATE_LIMIT_WINDOW_MS`, `TRANSLATE_SERVICE_URL`, `NODE_ENV`.
   */
  public static checkVariables(): void {
    try {
      EnvUtils.get<string>("REDIS_URL", true);
      EnvUtils.get<number>("PORT");
      EnvUtils.get<number>("RATE_LIMIT_MAX");
      EnvUtils.get<number>("RATE_LIMIT_WINDOW_MS");
      EnvUtils.get<string>("TRANSLATE_SERVICE_URL");
      EnvUtils.get<string>("NODE_ENV");
    } catch (error) {
      logger.error("Error loading environment variables", { meta: error });
      process.exit(1);
    }
  }

  /**
   * Resolved environment variables with defaults applied.
   *
   * Accessible after {@link EnvUtils.checkVariables} has run.  Each property
   * falls back to a sensible default when the corresponding env var is absent.
   *
   * @property REDIS_URL - Redis connection string (required).
   * @property PORT - HTTP server port (default 3000).
   * @property RATE_LIMIT_MAX - Max requests per time window (default 100).
   * @property RATE_LIMIT_WINDOW_MS - Rate-limit time window in ms (default 60000).
   * @property TRANSLATE_SERVICE_URL - Python translation worker URL (default http://localhost:8000).
   * @property NODE_ENV - Runtime environment (default "development").
   */
  public static variables = {
    REDIS_URL: EnvUtils.get<string>("REDIS_URL", true),
    PORT: EnvUtils.get<number>("PORT") ?? 3000,
    RATE_LIMIT_MAX: EnvUtils.get<number>("RATE_LIMIT_MAX") ?? 100,
    RATE_LIMIT_WINDOW_MS: EnvUtils.get<number>("RATE_LIMIT_WINDOW_MS") ?? 60000,
    TRANSLATE_SERVICE_URL: EnvUtils.get<string>("TRANSLATE_SERVICE_URL") ?? "http://localhost:8000",
    NODE_ENV: EnvUtils.get<string>("NODE_ENV") ?? "development",
  };
}
