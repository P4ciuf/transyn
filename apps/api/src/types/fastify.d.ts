import "fastify";

/**
 * Augments Fastify's instance type with a `queueService` preHandler hook
 * slot so that the QueueService initialisation can be registered as a
 * route-level `preHandler` without manual casting.
 */
declare module "fastify" {
  interface FastifyInstance {
    queueService: import("fastify").preHandlerHookHandler;
  }
}
