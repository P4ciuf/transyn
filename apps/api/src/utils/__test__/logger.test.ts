import { describe, it, expect, beforeEach, vi } from "vitest";

const mockLogInstance = {
  error: vi.fn(),
  warn: vi.fn(),
  info: vi.fn(),
  debug: vi.fn(),
};

vi.mock("winston", () => ({
  default: {
    createLogger: vi.fn().mockReturnValue(mockLogInstance),
    format: {
      timestamp: vi.fn().mockReturnValue("mocked-timestamp"),
      printf: vi.fn().mockImplementation((fn: (...args: unknown[]) => string) => fn),
      combine: vi.fn((...args: unknown[]) => args),
      errors: vi.fn().mockReturnValue("mocked-errors"),
    },
    transports: {
      Console: vi.fn(),
    },
  },
}));

vi.mock("winston-daily-rotate-file", () => ({
  default: vi.fn(),
}));

vi.mock("fs", () => ({
  default: {
    existsSync: vi.fn().mockReturnValue(true),
    mkdirSync: vi.fn(),
  },
}));

describe("logger", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("error", () => {
    it("calls winston error with the formatted message", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.error("Something failed");
      expect(mockLogInstance.error).toHaveBeenCalledWith("Something failed", undefined);
    });

    it("includes optional meta data", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      const meta = { foo: "bar" };
      logger.error("Something failed", { meta });
      expect(mockLogInstance.error).toHaveBeenCalledWith("Something failed", meta);
    });

    it("includes custom prefix when provided", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.error("Connection lost", { customPrefix: "redis" });
      expect(mockLogInstance.error).toHaveBeenCalledWith("[REDIS] Connection lost", undefined);
    });
  });

  describe("warn", () => {
    it("calls winston warn with the formatted message", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.warn("Disk space low");
      expect(mockLogInstance.warn).toHaveBeenCalledWith("Disk space low", undefined);
    });

    it("includes custom prefix", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.warn("Retrying", { customPrefix: "bullmq" });
      expect(mockLogInstance.warn).toHaveBeenCalledWith("[BULLMQ] Retrying", undefined);
    });
  });

  describe("info", () => {
    it("calls winston info with the formatted message", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.info("Server started");
      expect(mockLogInstance.info).toHaveBeenCalledWith("Server started", undefined);
    });

    it("includes meta data", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.info("Server started", { meta: { port: 3000 } });
      expect(mockLogInstance.info).toHaveBeenCalledWith("Server started", { port: 3000 });
    });
  });

  describe("debug", () => {
    it("calls winston debug in development mode", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.debug("Detailed trace");
      expect(mockLogInstance.debug).toHaveBeenCalledWith("Detailed trace", undefined);
    });
  });

  describe("audit", () => {
    it("calls winston info with structured audit message", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.audit("LOGIN_SUCCESS", "user@example.com");
      expect(mockLogInstance.info).toHaveBeenCalledWith(
        "[AUDIT] LOGIN_SUCCESS",
        { actor: "user@example.com", resource: undefined },
      );
    });

    it("includes resource and prefix when provided", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.audit("SECRET_READ", "user@example.com", "secret:abc123", "api");
      expect(mockLogInstance.info).toHaveBeenCalledWith(
        "[AUDIT] [API] SECRET_READ",
        { actor: "user@example.com", resource: "secret:abc123" },
      );
    });

    it("includes additional meta when provided", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.audit("SECRET_READ", "user@example.com", "secret:xyz", undefined, { count: 5 });
      expect(mockLogInstance.info).toHaveBeenCalledWith(
        "[AUDIT] SECRET_READ",
        { actor: "user@example.com", resource: "secret:xyz", meta: { count: 5 } },
      );
    });
  });

  describe("formatMessage", () => {
    it("uppercases the custom prefix in the message", async () => {
      vi.stubEnv("NODE_ENV", "development");
      const { logger } = await import("../logger.js");
      vi.clearAllMocks();

      logger.info("Hello", { customPrefix: "myModule" });
      expect(mockLogInstance.info).toHaveBeenCalledWith("[MYMODULE] Hello", undefined);
    });
  });
});
