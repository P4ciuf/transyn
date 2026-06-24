import { describe, it, expect, beforeEach, vi } from "vitest";
import { loadRoutes } from "../loader.js";
import type { FastifyInstance, RouteOptions } from "fastify";

vi.mock("fast-glob", () => ({
  default: vi.fn(),
}));

vi.mock("url", () => ({
  fileURLToPath: vi.fn().mockReturnValue("/app/src/utils/loader.js"),
}));

describe("loadRoutes", () => {
  let mockApp: FastifyInstance;

  beforeEach(() => {
    vi.clearAllMocks();
    mockApp = {
      route: vi.fn(),
    } as unknown as FastifyInstance;
  });

  it("discovers and registers route modules", async () => {
    const fg = await import("fast-glob");
    const routeFactory = vi.fn().mockReturnValue({
      method: "POST",
      url: "/translate",
      handler: vi.fn(),
    } satisfies RouteOptions);
    const mockModule = { default: routeFactory };

    vi.mocked(fg.default).mockResolvedValue(["/app/src/routes/translate.route.ts"]);
    vi.doMock("/app/src/routes/translate.route.ts", () => mockModule);

    await loadRoutes(mockApp);

    expect(fg.default).toHaveBeenCalledWith(
      expect.stringMatching(/routes\/\*\*\/\*\.route\.\{ts,js\}$/),
      { absolute: true },
    );
    expect(routeFactory).toHaveBeenCalledWith(mockApp);
    expect(mockApp.route).toHaveBeenCalledWith({
      method: "POST",
      url: "/translate",
      handler: expect.any(Function),
    });
  });

  it("registers multiple routes when multiple files are found", async () => {
    const fg = await import("fast-glob");
    const route1 = { method: "POST", url: "/translate", handler: vi.fn() };
    const route2 = { method: "GET", url: "/stats", handler: vi.fn() };

    vi.mocked(fg.default).mockResolvedValue([
      "/app/src/routes/translate.route.ts",
      "/app/src/routes/stats.route.ts",
    ]);
    vi.doMock("/app/src/routes/translate.route.ts", () => ({
      default: vi.fn().mockReturnValue(route1),
    }));
    vi.doMock("/app/src/routes/stats.route.ts", () => ({
      default: vi.fn().mockReturnValue(route2),
    }));

    await loadRoutes(mockApp);

    expect(mockApp.route).toHaveBeenCalledTimes(2);
    expect(mockApp.route).toHaveBeenCalledWith(route1);
    expect(mockApp.route).toHaveBeenCalledWith(route2);
  });

  it("skips files that do not export a route factory", async () => {
    const fg = await import("fast-glob");
    vi.mocked(fg.default).mockResolvedValue(["/app/src/routes/empty.route.ts"]);
    vi.doMock("/app/src/routes/empty.route.ts", () => ({ default: undefined }));

    await loadRoutes(mockApp);

    expect(mockApp.route).not.toHaveBeenCalled();
  });

  it("skips files that export a falsy default", async () => {
    const fg = await import("fast-glob");
    vi.mocked(fg.default).mockResolvedValue(["/app/src/routes/null.route.ts"]);
    vi.doMock("/app/src/routes/null.route.ts", () => ({ default: null }));

    await loadRoutes(mockApp);

    expect(mockApp.route).not.toHaveBeenCalled();
  });

  it("handles an empty file list gracefully", async () => {
    const fg = await import("fast-glob");
    vi.mocked(fg.default).mockResolvedValue([]);

    await loadRoutes(mockApp);

    expect(mockApp.route).not.toHaveBeenCalled();
  });

  it("passes the fastify instance to each route factory", async () => {
    const fg = await import("fast-glob");
    const routeFactory = vi.fn().mockReturnValue({
      method: "GET",
      url: "/health",
      handler: vi.fn(),
    });

    vi.mocked(fg.default).mockResolvedValue(["/app/src/routes/health.route.ts"]);
    vi.doMock("/app/src/routes/health.route.ts", () => ({ default: routeFactory }));

    await loadRoutes(mockApp);

    expect(routeFactory).toHaveBeenCalledWith(mockApp);
  });
});
