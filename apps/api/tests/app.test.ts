import { describe, it, expect, vi } from "vitest";

vi.stubEnv("REDIS_URL", "redis://localhost:6379");
vi.stubEnv("PORT", "0");
vi.stubEnv("RATE_LIMIT_MAX", "100");
vi.stubEnv("RATE_LIMIT_WINDOW_MS", "60000");
vi.stubEnv("TRANSLATE_SERVICE_URL", "http://localhost:8000");
vi.stubEnv("NODE_ENV", "test");

const mockFastifyInstance = {
  register: vi.fn(),
  route: vi.fn(),
  decorate: vi.fn(),
  get: vi.fn(),
  ready: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn((_opts: unknown, cb: (err: Error | null) => void) => {
    cb(null);
  }),
  setErrorHandler: vi.fn(),
  server: { close: vi.fn() },
  close: vi.fn().mockResolvedValue(undefined),
};

vi.mock("fastify", () => ({
  default: vi.fn().mockReturnValue(mockFastifyInstance),
}));

vi.mock("@fastify/rate-limit", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/helmet", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/cors", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/swagger", () => ({
  default: vi.fn(),
}));

vi.mock("@fastify/swagger-ui", () => ({
  default: vi.fn(),
}));

vi.mock("../src/utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
    audit: vi.fn(),
  },
}));

vi.mock("../src/utils/env.js", () => ({
  EnvUtils: {
    checkVariables: vi.fn(),
    variables: {
      REDIS_URL: "redis://localhost:6379",
      PORT: 3000,
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_WINDOW_MS: 60000,
      TRANSLATE_SERVICE_URL: "http://localhost:8000",
      NODE_ENV: "test",
    },
  },
}));

vi.mock("../src/utils/loader.js", () => ({
  loadRoutes: vi.fn(),
}));

vi.mock("../src/errors/errorHandler.js", () => ({
  registerErrorHandler: vi.fn(),
}));

describe("Fastify app", () => {
  it("creates and configures the Fastify server without crashing", async () => {
    // Importing the module should complete without throwing
    await expect(import("../src/app.js")).resolves.toBeDefined();
    expect(mockFastifyInstance.ready).toHaveBeenCalled();
    expect(mockFastifyInstance.listen).toHaveBeenCalled();
  });

  it("registers the helmet plugin", async () => {
    await import("../src/app.js");
    const helmet = await import("@fastify/helmet");
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(helmet.default, { global: true });
  });

  it("registers the rate-limit plugin", async () => {
    await import("../src/app.js");
    const rateLimit = await import("@fastify/rate-limit");
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(rateLimit.default, {
      max: 100,
      timeWindow: 60000,
    });
  });

  it("registers the CORS plugin", async () => {
    await import("../src/app.js");
    const cors = await import("@fastify/cors");
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(cors.default, {
      origin: "*",
      credentials: false,
    });
  });

  it("registers the Swagger plugin", async () => {
    await import("../src/app.js");
    const swagger = await import("@fastify/swagger");
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(swagger.default, expect.objectContaining({
      openapi: expect.objectContaining({
        openapi: "3.1.0",
        info: expect.objectContaining({
          title: "Transyn API",
          version: "1.0.0",
        }),
      }),
    }));
  });

  it("registers the route loader with /api prefix", async () => {
    await import("../src/app.js");
    const { loadRoutes } = await import("../src/utils/loader.js");
    expect(mockFastifyInstance.register).toHaveBeenCalledWith(loadRoutes, { prefix: "/api" });
  });

  it("registers the error handler", async () => {
    await import("../src/app.js");
    const { registerErrorHandler } = await import("../src/errors/errorHandler.js");
    expect(registerErrorHandler).toHaveBeenCalledWith(mockFastifyInstance);
  });
});
