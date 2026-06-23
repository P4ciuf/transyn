import { describe, it, expect, beforeEach, vi } from "vitest";

vi.mock("dotenv", () => ({
  default: {
    config: vi.fn(),
  },
}));

describe("EnvUtils", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("REDIS_URL", "redis://localhost:6379");
  });

  describe("variables", () => {
    it("returns REDIS_URL from the environment", async () => {
      vi.stubEnv("REDIS_URL", "redis://prod:6379");
      const { EnvUtils } = await import("../env.js");
      expect(EnvUtils.variables.REDIS_URL).toBe("redis://prod:6379");
    });

    it("returns the default PORT (3000) when not set", async () => {
      delete process.env.PORT;
      const { EnvUtils } = await import("../env.js");
      expect(EnvUtils.variables.PORT).toBe(3000);
    });

    it("returns the default RATE_LIMIT_MAX (100)", async () => {
      delete process.env.RATE_LIMIT_MAX;
      const { EnvUtils } = await import("../env.js");
      expect(EnvUtils.variables.RATE_LIMIT_MAX).toBe(100);
    });

    it("returns the default RATE_LIMIT_WINDOW_MS (60000)", async () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;
      const { EnvUtils } = await import("../env.js");
      expect(EnvUtils.variables.RATE_LIMIT_WINDOW_MS).toBe(60000);
    });

    it("returns the default TRANSLATE_SERVICE_URL when not set", async () => {
      delete process.env.TRANSLATE_SERVICE_URL;
      const { EnvUtils } = await import("../env.js");
      expect(EnvUtils.variables.TRANSLATE_SERVICE_URL).toBe("http://localhost:8000");
    });

    it("returns the default NODE_ENV (development)", async () => {
      delete process.env.NODE_ENV;
      const { EnvUtils } = await import("../env.js");
      expect(EnvUtils.variables.NODE_ENV).toBe("development");
    });
  });

  describe("checkVariables", () => {
    it("does not call process.exit when REDIS_URL is set", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      const { EnvUtils } = await import("../env.js");
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

      EnvUtils.checkVariables();
      expect(exitSpy).not.toHaveBeenCalled();
      exitSpy.mockRestore();
    });

    it("calls process.exit(1) when REDIS_URL is missing", async () => {
      vi.stubEnv("REDIS_URL", "redis://localhost:6379");
      const { EnvUtils } = await import("../env.js");

      delete process.env.REDIS_URL;

      const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
      EnvUtils.checkVariables();
      expect(exitSpy).toHaveBeenCalledWith(1);
      exitSpy.mockRestore();
    });
  });
});
