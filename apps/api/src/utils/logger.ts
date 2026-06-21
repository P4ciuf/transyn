import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import path from "path";
import fs from "fs";

// Ensure the logs directory exists at module-load time — transports
// will attempt to write immediately on first log call and will fail
// if the parent directory is missing.
const logsDir = path.resolve(process.cwd(), "logs");
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const COLOURS: Record<string, string> = {
  error: "\x1b[31m",
  warn: "\x1b[33m",
  info: "\x1b[36m",
  debug: "\x1b[35m",
  reset: "\x1b[0m",
};

const timestamp = winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" });

// Console uses ANSI colour codes per level; file output omits colours for grep-friendly archival
const colouredConsole = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const colour = COLOURS[level as string] ?? "";
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `${colour}[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${COLOURS.reset}`;
});

const plainFile = winston.format.printf(({ level, message, timestamp, ...meta }) => {
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
});

const isDevelopment = process.env.NODE_ENV === "development";

const rotateOptions = {
  datePattern: "YYYY-MM-DD",
  maxFiles: "7d",
  zippedArchive: false,
  format: winston.format.combine(timestamp, winston.format.errors({ stack: true }), plainFile),
};

const transports: winston.transport[] = [
  new winston.transports.Console({
    level: isDevelopment ? "debug" : "info",
    format: winston.format.combine(
      timestamp,
      winston.format.errors({ stack: true }),
      colouredConsole,
    ),
  }),
  new DailyRotateFile({
    ...rotateOptions,
    level: isDevelopment ? "debug" : "info",
    filename: path.join(logsDir, "logs-data-%DATE%.log"),
  }),
];

// Logger errors must never crash the process — logging is non-critical infrastructure
const log = winston.createLogger({
  level: isDevelopment ? "debug" : "info",
  transports,
  exitOnError: false,
});

/**
 * Application logger wrapping a Winston instance with console and daily-rotate
 * transports. The {@code debug} level is suppressed in production to reduce
 * verbosity. The underlying logger uses {@code exitOnError: false} so logging
 * failures never crash the process.
 *
 * Includes an {@code audit} method for security-relevant events (login attempts,
 * secret access, MFA changes) that writes at the {@code info} level with a
 * structured {@code [AUDIT]} prefix for easy filtering in log aggregation tools.
 */
export const logger = {
  /**
   * Logs a message at {@code error} severity. Always emitted regardless of
   * {@code NODE_ENV}.
   *
   * @param message - Human-readable error description.
   * @param meta    - Optional structured context (e.g. the caught error object).
   */
  error(message: string, meta?: unknown): void {
    log.error(message, meta);
  },

  /**
   * Logs a message at {@code warn} severity.
   *
   * @param message - Human-readable warning description.
   * @param meta    - Optional structured context.
   */
  warn(message: string, meta?: unknown): void {
    log.warn(message, meta);
  },

  /**
   * Logs a message at {@code info} severity.
   *
   * @param message - Human-readable informational message.
   * @param meta    - Optional structured context.
   */
  info(message: string, meta?: unknown): void {
    log.info(message, meta);
  },

  /**
   * Logs a message at {@code debug} severity. Automatically suppressed in
   * production.
   *
   * @param message - Debug-level message.
   * @param meta    - Optional structured context.
   */
  debug(message: string, meta?: unknown): void {
    // Short-circuit in production to avoid building the arguments object
    if (isDevelopment) {
      log.debug(message, meta);
    }
  },

  /**
   * Records a security-relevant audit event at {@code info} level with a
   * structured {@code [AUDIT]} prefix. Use for login attempts, secret access,
   * MFA state changes, and other actions that require an immutable trail.
   *
   * @param action   - Machine-readable action name (e.g. {@code "LOGIN_SUCCESS"}).
   * @param actor    - Identifier of the user performing the action (typically email).
   * @param resource - Optional identifier of the target resource (e.g. {@code "secret:abc123"}).
   * @param meta     - Optional additional structured data (e.g. {@code { count: 5 }}).
   *
   * @example
   * logger.audit("SECRET_READ", user.email, "secret:xyz", { projectId: "proj_1" });
   */
  audit(action: string, actor: string, resource?: string, meta?: unknown): void {
    log.info(`[AUDIT] ${action}`, { actor, resource, ...(meta ? { meta } : {}) });
  },
};
