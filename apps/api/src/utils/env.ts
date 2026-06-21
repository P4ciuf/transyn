import dotenv from "dotenv";
import { logger } from "./logger.js";
dotenv.config();

/**
 * Static helper for accessing and validating environment variables.
 *
 * Loads dotenv on import, provides type-safe accessors with default values,
 * and fails fast at startup if any required variable is missing.
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
      logger.error("Error loading environment variables", { error });
      process.exit(1);
    }
  }

  /**
   * Resolved environment variables with defaults applied.
   *
   * Accessible after {@link EnvUtils.checkVariables} has run.  Each property
   * falls back to a sensible default when the corresponding env var is absent.
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
