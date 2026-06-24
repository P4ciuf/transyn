import { ErrorCodeValue, errorCode } from "../types/error.js";

/**
 * Application-level error class extending the native Error with an HTTP status code
 * and a machine-readable error code. Use the static factory methods to create instances
 * with pre-configured status codes.
 */
export class AppError extends Error {
  statusCode: number;

  errorCode: ErrorCodeValue;

  /**
   * @param message - Human-readable error description
   * @param statusCode - HTTP status code (default 500)
   * @param code - Machine-readable error code (default "INTERNAL_SERVER")
   */
  constructor(message?: string, statusCode = 500, code: ErrorCodeValue = "INTERNAL_SERVER") {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = code;
  }

  /**
   * Creates an AppError with HTTP 400 status.
   *
   * @param message - Human-readable error description
   * @param code - Error code (default "BAD_REQUEST")
   */
  static BadRequest(message: string, code: ErrorCodeValue = "BAD_REQUEST") {
    return new this(message, 400, code);
  }

  /**
   * Creates an AppError with HTTP 401 status.
   *
   * @param message - Human-readable error description (default "Unauthorized")
   * @param code - Error code (default "UNAUTHORIZED")
   */
  static Unauthorized(message: string = "Unauthorized", code: ErrorCodeValue = "UNAUTHORIZED") {
    return new this(message, 401, code);
  }

  /**
   * Creates an AppError with HTTP 403 status.
   *
   * @param message - Human-readable error description
   * @param code - Error code (default "FORBIDDEN")
   */
  static Forbidden(
    message: string = "You don't have permission to perform this action",
    code: ErrorCodeValue = "FORBIDDEN",
  ) {
    return new this(message, 403, code);
  }

  /**
   * Creates an AppError with HTTP 404 status.
   *
   * @param message - Human-readable error description
   * @param code - Error code (default "NOT_FOUND")
   */
  static NotFound(message: string, code: ErrorCodeValue = "NOT_FOUND") {
    return new this(message, 404, code);
  }

  /**
   * Creates an AppError with HTTP 409 status.
   *
   * @param message - Human-readable error description
   */
  static Conflict(message: string) {
    return new this(message, 409, "CONFLICT");
  }

  /**
   * Creates an AppError with HTTP 500 status.
   *
   * @param message - Human-readable error description
   */
  static InternalServer(message: string) {
    return new this(message, 500, "INTERNAL_SERVER");
  }

  /**
   * Creates an AppError with HTTP 406 status.
   *
   * @param message - Human-readable error description
   */
  static NotAcceptable(message: string) {
    return new this(message, 406, errorCode.NOT_ACCEPTABLE);
  }

  /**
   * Creates an AppError with HTTP 429 status and a default rate-limit message.
   */
  static TooManyRequests() {
    return new this("Too many requests. Please try again later.", 429, errorCode.TOO_MANY_REQUESTS);
  }

  /**
   * Creates an AppError with HTTP 404 status using a dynamic resource name.
   *
   * @param resource - Name of the resource that was not found
   */
  static ResourceNotFound(resource: string) {
    return new this(`${resource} not found`, 404, errorCode.RESOURCE_NOT_FOUND);
  }
}
