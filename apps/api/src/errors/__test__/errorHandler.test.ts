import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { registerErrorHandler } from "../errorHandler.js";
import { AppError } from "../appError.js";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

vi.mock("../../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const { logger } = await import("../../utils/logger.js");

describe("registerErrorHandler", () => {
  let setErrorHandlerFn:
    | ((error: Error, req: FastifyRequest, reply: FastifyReply) => Promise<void>)
    | undefined;
  let mockReply: { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };
  let mockReq: { log: { error: ReturnType<typeof vi.fn> } };
  let mockApp: FastifyInstance;

  function buildMockReply(): { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
    const send = vi.fn();
    const code = vi.fn().mockImplementation(() => ({ code, send }) as unknown as FastifyReply);
    return { code, send };
  }

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NODE_ENV = "test";
    setErrorHandlerFn = undefined;

    mockReply = buildMockReply();

    mockReq = {
      log: { error: vi.fn() },
    };

    mockApp = {
      setErrorHandler: vi.fn().mockImplementation((fn) => {
        setErrorHandlerFn = fn;
      }),
    } as unknown as FastifyInstance;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("AppError instances", () => {
    it("returns the correct status code, message, and error code for a 400 BadRequest", async () => {
      registerErrorHandler(mockApp);
      const error = AppError.BadRequest("Invalid input");

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "Invalid input",
        code: "BAD_REQUEST",
      });
    });

    it("returns the correct status code for a 401 Unauthorized", async () => {
      registerErrorHandler(mockApp);
      const error = AppError.Unauthorized();

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(401);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "Unauthorized",
        code: "UNAUTHORIZED",
      });
    });

    it("returns 500 for AppError with default constructor", async () => {
      registerErrorHandler(mockApp);
      const error = new AppError();

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "",
        code: "INTERNAL_SERVER",
      });
    });
  });

  describe("validation errors", () => {
    it("returns 400 with details when the error has a validation property", async () => {
      registerErrorHandler(mockApp);
      const validationDetails = [{ path: ["text"], message: "Required" }];
      const error = { validation: validationDetails, statusCode: 400 } as unknown as Error;

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(400);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "Validation error",
        code: "BAD_REQUEST",
        details: validationDetails,
      });
    });
  });

  describe("errors with statusCode property", () => {
    it("returns the statusCode from the error and TOO_MANY_REQUESTS code", async () => {
      registerErrorHandler(mockApp);
      const error = { statusCode: 429, message: "Rate limit exceeded" } as unknown as Error;

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "Rate limit exceeded",
        code: "TOO_MANY_REQUESTS",
      });
    });

    it("falls back to default message when message is missing", async () => {
      registerErrorHandler(mockApp);
      const error = { statusCode: 429 } as unknown as Error;

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(429);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "Request error",
        code: "TOO_MANY_REQUESTS",
      });
    });
  });

  describe("unexpected errors", () => {
    it("returns 500 with INTERNAL_SERVER for unknown error shapes", async () => {
      registerErrorHandler(mockApp);
      const error = new Error("Something went wrong");

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReply.code).toHaveBeenCalledWith(500);
      expect(mockReply.send).toHaveBeenCalledWith({
        success: false,
        message: "Internal Server Error",
        code: "INTERNAL_SERVER",
      });
    });

    it("logs the error on the request logger", async () => {
      registerErrorHandler(mockApp);
      const error = new Error("Unexpected error");

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(mockReq.log.error).toHaveBeenCalledWith(error);
    });
  });

  describe("logging behaviour", () => {
    it("logs the error via logger when NODE_ENV is not test", async () => {
      process.env.NODE_ENV = "production";
      registerErrorHandler(mockApp);
      const error = new Error("Prod error");

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(logger.error).toHaveBeenCalledWith("New Error detected:", { meta: error });

      process.env.NODE_ENV = "test";
    });

    it("suppresses logger.error in test mode", async () => {
      process.env.NODE_ENV = "test";
      registerErrorHandler(mockApp);
      const error = new Error("Test error");

      await setErrorHandlerFn!(
        error,
        mockReq as unknown as FastifyRequest,
        mockReply as unknown as FastifyReply,
      );

      expect(logger.error).not.toHaveBeenCalled();
    });
  });
});
