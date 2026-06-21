import fg from "fast-glob";
import { fileURLToPath } from "url";
import { join, dirname } from "path";
import type { FastifyInstance } from "fastify";
import type { AppRouteObject } from "../types/route.js";

/**
 * Discovers and registers all route modules matching `**\/*.route.{ts,js}` under the routes directory.
 * Each module must export an `AppRouteObject` as its default export.
 * Designed to be used as a Fastify plugin so that previously registered hooks (e.g. Swagger's onRoute)
 * are active during registration.
 *
 * @param app - The Fastify instance on which routes will be registered
 * @async
 */
export async function loadRoutes(app: FastifyInstance) {
  const currentDir = dirname(fileURLToPath(import.meta.url));
  const routesDir = join(currentDir, "../routes");
  // Match both .ts and .js so it works with tsx (dev) and compiled output (prod)
  const pattern = `${routesDir}/**/*.route.{ts,js}`;

  const files = await fg(pattern, { absolute: true });

  for (const file of files) {
    const mod = await import(file);
    const factory: AppRouteObject = mod.default;
    // Skip files that do not export a route factory (e.g. non-route modules caught by the glob)
    if (!factory) continue;
    const route = factory(app);
    app.route(route);
  }
}
