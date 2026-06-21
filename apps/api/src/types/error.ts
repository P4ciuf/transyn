/**
 * Standardized JSON structure returned by the API on every non-2xx response.
 *
 * @property success - Always {@code false} for error responses
 * @property message - Human-readable description of the error
 * @property code - Machine-readable error code from {@link errorCode}
 * @property details - Optional structured data providing additional context (e.g. validation errors)
 */
export interface ErrorResponse {
  success: false;
  message: string;
  code: ErrorCodeValue;
  details?: unknown;
}

/**
 * Standardized error codes shared between the API server and the typed API client.
 *
 * Each value corresponds to a specific HTTP error category and is returned in
 * the {@code code} field of every {@link ErrorResponse}.
 */
const errorCode = {
  /** Generic client error — malformed request or invalid input. */
  BAD_REQUEST: "BAD_REQUEST",
  /** Authentication required — missing or invalid credentials. */
  UNAUTHORIZED: "UNAUTHORIZED",
  /** Authenticated but insufficient permissions for the requested resource. */
  FORBIDDEN: "FORBIDDEN",
  /** Requested resource does not exist. */
  NOT_FOUND: "NOT_FOUND",
  /** The request conflicts with the current state of the resource. */
  CONFLICT: "CONFLICT",
  /** Unhandled server-side failure. */
  INTERNAL_SERVER: "INTERNAL_SERVER",
  /** The server cannot produce a response matching the client's Accept header. */
  NOT_ACCEPTABLE: "NOT_ACCEPTABLE",
  /** Rate limit exceeded — the client must wait before retrying. */
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  /** A specific named resource (e.g. a project or a user) was not found. */
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
} as const;

type ErrorCodeMap = typeof errorCode;

/** Union of all valid error code string literals. */
type ErrorCodeValue = ErrorCodeMap[keyof ErrorCodeMap];

export { errorCode, type ErrorCodeValue };
