/**
 * Barrel module for the plugins layer.
 *
 * Re-exports every public class and interface from the Redis, BullMQ,
 * and any future plugin modules so consumers can import from a single
 * entry point.
 *
 * @module plugins
 */
export * from "./bullmq.js";
export * from "./redis.js";
