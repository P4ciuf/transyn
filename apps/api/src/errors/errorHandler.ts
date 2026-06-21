import { ErrorCodeValue, ErrorResponse } from "../types/error.js";
import { logger } from "../utils/logger.js";
import { AppError } from "./appError.js";
import type { FastifyInstance } from "fastify";

/**
 * Builds a standardized error response object with optional detail information.
 *
 * @param message - Human-readable error description
 * @param code   - Machine-readable error code
 * @param details - Optional structured data providing additional error context
 * @returns A conforming ErrorResponse object
 */
function standardErrorResponse(
  message: string,
  code: ErrorCodeValue,
  details?: unknown,
): ErrorResponse {
  return {
    success: false as const,
    message,
    code,
    ...(details ? { details } : {}),
  };
}

/**
 * Registers a global error handler on the Fastify instance.
 *
 * Handles four error shapes in order: AppError instances, Fastify validation
 * errors, errors carrying a statusCode property (e.g. rate-limit responses),
 * and any unexpected error (treated as 500).  Logging is suppressed when
 * NODE_ENV is "test" to keep test output clean.
 *
 * @param app - The Fastify application instance
 */
export function registerErrorHandler(app: FastifyInstance) {
  app.setErrorHandler((error, req, reply) => {
    // Suppress logging during test runs to keep output clean
    if (process.env.NODE_ENV !== "test") {
      logger.error("New Error detected:", error);
    }

    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        success: false,
        message: error.message,
        code: error.errorCode,
      });
    }

    if ("validation" in (error as Record<string, unknown>)) {
      return reply
        .code(400)
        .send(
          standardErrorResponse(
            "Validation error",
            "BAD_REQUEST",
            (error as Record<string, unknown>).validation,
          ),
        );
    }

    // Catch errors that already carry an HTTP status (e.g. @fastify/rate-limit rejections)
    const fallback = error as Record<string, unknown>;

    if (typeof fallback.statusCode === "number") {
      return reply
        .code(fallback.statusCode as number)
        .send(
          standardErrorResponse(
            (fallback.message as string) ?? "Request error",
            "TOO_MANY_REQUESTS",
          ),
        );
    }

    req.log.error(error);

    return reply.code(500).send(standardErrorResponse("Internal Server Error", "INTERNAL_SERVER"));
  });
}
