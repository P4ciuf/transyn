import { describe, it, expect } from "vitest";
import { AppError } from "../appError.js";
import { errorCode } from "../../types/error.js";

describe("AppError", () => {
  describe("constructor", () => {
    it("creates an error with default 500 status and INTERNAL_SERVER code", () => {
      const err = new AppError();
      expect(err).toBeInstanceOf(Error);
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe("INTERNAL_SERVER");
      expect(err.message).toBe("");
    });

    it("creates an error with a custom message and status code", () => {
      const err = new AppError("Not found", 404, "NOT_FOUND");
      expect(err.statusCode).toBe(404);
      expect(err.errorCode).toBe("NOT_FOUND");
      expect(err.message).toBe("Not found");
    });
  });

  describe("static factories", () => {
    it("BadRequest creates a 400 error", () => {
      const err = AppError.BadRequest("Invalid input");
      expect(err.statusCode).toBe(400);
      expect(err.errorCode).toBe("BAD_REQUEST");
      expect(err.message).toBe("Invalid input");
    });

    it("BadRequest accepts custom error code", () => {
      const err = AppError.BadRequest("Invalid input", "VALIDATION_ERROR" as AppError["errorCode"]);
      expect(err.errorCode).toBe("VALIDATION_ERROR");
    });

    it("Unauthorized creates a 401 error with default message", () => {
      const err = AppError.Unauthorized();
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe("UNAUTHORIZED");
      expect(err.message).toBe("Unauthorized");
    });

    it("Unauthorized accepts custom message and code", () => {
      const err = AppError.Unauthorized("Not logged in", "LOGIN_REQUIRED" as AppError["errorCode"]);
      expect(err.statusCode).toBe(401);
      expect(err.errorCode).toBe("LOGIN_REQUIRED");
      expect(err.message).toBe("Not logged in");
    });

    it("Forbidden creates a 403 error with default message", () => {
      const err = AppError.Forbidden();
      expect(err.statusCode).toBe(403);
      expect(err.errorCode).toBe("FORBIDDEN");
      expect(err.message).toBe("You don't have permission to perform this action");
    });

    it("Forbidden accepts custom message and code", () => {
      const err = AppError.Forbidden("No access", "NO_ACCESS" as AppError["errorCode"]);
      expect(err.statusCode).toBe(403);
      expect(err.errorCode).toBe("NO_ACCESS");
      expect(err.message).toBe("No access");
    });

    it("NotFound creates a 404 error", () => {
      const err = AppError.NotFound("User not found");
      expect(err.statusCode).toBe(404);
      expect(err.errorCode).toBe("NOT_FOUND");
      expect(err.message).toBe("User not found");
    });

    it("Conflict creates a 409 error", () => {
      const err = AppError.Conflict("Already exists");
      expect(err.statusCode).toBe(409);
      expect(err.errorCode).toBe("CONFLICT");
      expect(err.message).toBe("Already exists");
    });

    it("InternalServer creates a 500 error", () => {
      const err = AppError.InternalServer("DB connection failed");
      expect(err.statusCode).toBe(500);
      expect(err.errorCode).toBe("INTERNAL_SERVER");
      expect(err.message).toBe("DB connection failed");
    });

    it("NotAcceptable creates a 406 error", () => {
      const err = AppError.NotAcceptable("Unsupported format");
      expect(err.statusCode).toBe(406);
      expect(err.errorCode).toBe(errorCode.NOT_ACCEPTABLE);
      expect(err.message).toBe("Unsupported format");
    });

    it("TooManyRequests creates a 429 error with default message", () => {
      const err = AppError.TooManyRequests();
      expect(err.statusCode).toBe(429);
      expect(err.errorCode).toBe(errorCode.TOO_MANY_REQUESTS);
      expect(err.message).toBe("Too many requests. Please try again later.");
    });

    it("ResourceNotFound creates a 404 error with resource name in message", () => {
      const err = AppError.ResourceNotFound("Project");
      expect(err.statusCode).toBe(404);
      expect(err.errorCode).toBe(errorCode.RESOURCE_NOT_FOUND);
      expect(err.message).toBe("Project not found");
    });
  });
});
