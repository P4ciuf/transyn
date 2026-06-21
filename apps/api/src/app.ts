/**
 * Fastify application entry point.
 *
 * Creates and configures the server with helmet, rate limiting, CORS,
 * Swagger/OpenAPI documentation, and route autoloading. Runs environment
 * validation and error-handler registration on import.
 *
 * @module app
 */
import fastify from "fastify";
import rateLimit from "@fastify/rate-limit";
import helmet from "@fastify/helmet";
import cors from "@fastify/cors";
import fastifySwagger from "@fastify/swagger";
import fastifySwaggerUi from "@fastify/swagger-ui";
import { loadRoutes } from "./utils/loader.js";
import { logger } from "./utils/logger.js";
import { EnvUtils } from "./utils/env.js";
import { registerErrorHandler } from "./errors/errorHandler.js";

EnvUtils.checkVariables();

const app = fastify();

app.register(helmet, { global: true });
app.register(rateLimit, {
  max: EnvUtils.variables.RATE_LIMIT_MAX,
  timeWindow: EnvUtils.variables.RATE_LIMIT_WINDOW_MS,
});
app.register(cors, {
  origin: "*",
  credentials: false,
});

// Swagger must be registered before routes so its onRoute hook is active
app.register(fastifySwagger, {
  openapi: {
    openapi: "3.1.0",
    info: {
      title: "Transyn API",
      version: "1.0.0",
      description: "REST API for Transyn — a translation service.",
    },
    servers: [{ url: "https://transyn.xyz/api" }],
  },
});

app.register(fastifySwaggerUi, {
  routePrefix: "/docs",
  uiConfig: {
    docExpansion: "list",
    deepLinking: true,
  },
});

app.register(loadRoutes, {
  prefix: "/api",
});

registerErrorHandler(app);

await app.ready();

app.listen({ port: EnvUtils.variables.PORT, host: "[IP_ADDRESS]" }, (err) => {
  if (err) {
    logger.error("Error starting server", { err });
    process.exit(1);
  }
  logger.info(`Server running on port ${EnvUtils.variables.PORT}`);
});
