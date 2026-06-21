import type { FastifyInstance, RouteOptions } from "fastify";

/**
 * A route module must export a function (default export) that receives a FastifyInstance
 * and returns RouteOptions. This ensures all decorators (e.g. authenticate) are available
 * when the route object is constructed, since the factory is invoked during plugin boot
 * — after all preceding plugins have been registered.
 */
export type AppRouteObject = (fastify: FastifyInstance) => RouteOptions;
