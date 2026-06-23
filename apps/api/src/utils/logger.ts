import winston, { type Logform } from "winston";
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
const colouredConsole = winston.format.printf(
  ({ level, message, timestamp, ...meta }: Logform.TransformableInfo) => {
    const colour = COLOURS[level] ?? "";
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `${colour}[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}${COLOURS.reset}`;
  },
);

const plainFile = winston.format.printf(
  ({ level, message, timestamp, ...meta }: Logform.TransformableInfo) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
    return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
  },
);

const isDevelopment = process.env.NODE_ENV === "development";
const minLevel = isDevelopment ? "debug" : "info";

const rotateOptions = {
  datePattern: "YYYY-MM-DD",
  maxFiles: "7d",
  zippedArchive: false,
  format: winston.format.combine(timestamp, winston.format.errors({ stack: true }), plainFile),
};

const transports: winston.transport[] = [
  new winston.transports.Console({
    format: winston.format.combine(
      timestamp,
      winston.format.errors({ stack: true }),
      colouredConsole,
    ),
  } as winston.transports.ConsoleTransportOptions),
  new DailyRotateFile({
    ...rotateOptions,
    filename: path.join(logsDir, "logs-data-%DATE%.log"),
  } as DailyRotateFile.DailyRotateFileTransportOptions),
];

transports.forEach((t) => {
  t.level = minLevel;
});

// Logger errors must never crash the process — logging is non-critical infrastructure
const log = winston.createLogger({
  level: minLevel,
  transports,
  exitOnError: false,
});

/**
 * Options accepted by every log-level method.
 *
 * @property customPrefix - Module-specific prefix rendered in square brackets (e.g. "[REDIS]").
 * @property meta - Arbitrary structured data attached to the log entry.
 */
type LogOptions = { customPrefix?: string; meta?: unknown };

/** Severity levels supported by the application logger. */
type LogLevel = "error" | "warn" | "info" | "debug";

/**
 * Prepends an uppercased [PREFIX] to the message when a custom prefix is set.
 */
const formatMessage = (message: string, customPrefix?: string): string => {
  if (!customPrefix) return message;
  return `[${customPrefix.toUpperCase()}] ${message}`;
};

// Map of log level functions for type-safe dynamic dispatch
const loggers: Record<LogLevel, (message: string, meta?: unknown) => void> = {
  error: (message, meta) => log.error(message, meta),
  warn: (message, meta) => log.warn(message, meta),
  info: (message, meta) => log.info(message, meta),
  debug: (message, meta) => log.debug(message, meta),
};

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
   * Logs a message at the specified severity level.
   *
   * @param level   - Log level (error, warn, info, debug).
   * @param message - Human-readable message.
   * @param opt     - Optional configuration with custom prefix and metadata.
   */
  private(level: LogLevel, message: string, opt?: LogOptions): void {
    if (level === "debug" && !isDevelopment) return;
    const formattedMessage = formatMessage(message, opt?.customPrefix);
    loggers[level](formattedMessage, opt?.meta);
  },

  /**
   * Logs a message at {@code error} severity. Always emitted regardless of
   * {@code NODE_ENV}.
   *
   * @param message - Human-readable error description.
   * @param opt     - Optional configuration with custom prefix and metadata.
   */
  error(message: string, opt?: LogOptions): void {
    this.private("error", message, opt);
  },

  /**
   * Logs a message at {@code warn} severity.
   *
   * @param message - Human-readable warning description.
   * @param opt     - Optional configuration with custom prefix and metadata.
   */
  warn(message: string, opt?: LogOptions): void {
    this.private("warn", message, opt);
  },

  /**
   * Logs a message at {@code info} severity.
   *
   * @param message - Human-readable informational message.
   * @param opt     - Optional configuration with custom prefix and metadata.
   */
  info(message: string, opt?: LogOptions): void {
    this.private("info", message, opt);
  },

  /**
   * Logs a message at {@code debug} severity. Automatically suppressed in
   * production.
   *
   * @param message - Debug-level message.
   * @param opt     - Optional configuration with custom prefix and metadata.
   */
  debug(message: string, opt?: LogOptions): void {
    this.private("debug", message, opt);
  },

  /**
   * Records a security-relevant audit event at {@code info} level with a
   * structured {@code [AUDIT]} prefix. Use for login attempts, secret access,
   * MFA state changes, and other actions that require an immutable trail.
   *
   * @param action   - Machine-readable action name (e.g. {@code "LOGIN_SUCCESS"}).
   * @param actor    - Identifier of the user performing the action (typically email).
   * @param resource - Optional identifier of the target resource (e.g. {@code "secret:abc123"}).
   * @param prefix   - Optional additional prefix after [AUDIT].
   * @param meta     - Optional additional structured data (e.g. {@code { count: 5 }}).
   *
   * @example
   * logger.audit("SECRET_READ", user.email, "secret:xyz", "api", { projectId: "proj_1" });
   */
  audit(action: string, actor: string, resource?: string, prefix?: string, meta?: unknown): void {
    const prefixPart = prefix ? ` [${prefix.toUpperCase()}]` : "";
    const message = `[AUDIT]${prefixPart} ${action}`;
    log.info(message, { actor, resource, ...(meta ? { meta } : {}) });
  },
};
