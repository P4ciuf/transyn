import { FastifyInstance } from "fastify";
import { AppRouteObject } from "../types/route.js";
import { Langs } from "../config/langs.js";
import { QueueService } from "../services/bullmq.js";

/**
 * POST /translate route — submits text to the Hy-MT2 translation queue and
 * waits for the result.
 *
 * This is a route factory function conforming to {@link AppRouteObject};
 * the {@link loadRoutes} plugin calls it with the Fastify instance at
 * registration time so that all preceding plugins (Swagger, rate-limit,
 * etc.) have already been applied.
 *
 * @returns A Fastify {@link RouteOptions} object with schema validation
 *          and the translation handler.
 */
export default ((_fastify: FastifyInstance) => ({
  method: "POST",
  url: "/translate",
  schema: {
    description:
      "Submits a text translation job to the Hy-MT2-powered worker queue. " +
      "The request returns with a translation result once the worker " +
      "has completed processing.",
    summary: "Translate text",
    tags: ["Translation"],
    operationId: "translateText",
    body: {
      type: "object",
      required: ["text", "targetLanguage"],
      properties: {
        text: {
          type: "string",
          description: "Source text to translate.",
          examples: ["Hello, how are you?"],
        },
        targetLanguage: {
          type: "string",
          enum: Object.keys(Langs),
          description: "Hy-MT2 language code for the target language (e.g. 'fr', 'de', 'es').",
          examples: ["fr"],
        },
      },
    },
    response: {
      200: {
        description: "Translation completed successfully.",
        type: "object",
        properties: {
          translatedText: {
            type: "string",
            description: "The translated output string.",
          },
          targetLang: {
            type: "string",
            description: "Language the text was translated into.",
          },
        },
      },
      400: {
        description: "Validation error — missing or invalid request body.",
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          code: { type: "string" },
          details: { type: "array" },
        },
      },
      500: {
        description: "Internal server error — queue or worker failure.",
        type: "object",
        properties: {
          success: { type: "boolean", enum: [false] },
          message: { type: "string" },
          code: { type: "string" },
        },
      },
    },
  },
  handler: async (request, reply) => {
    const { text, targetLanguage } = request.body as {
      text: string;
      targetLanguage: string;
    };

    const queueService = await QueueService.init();
    const job = await queueService.submitTranslation(text, targetLanguage);
    const response = await queueService.waitForResult(job.id);

    return reply.code(200).send(response);
  },
})) satisfies AppRouteObject;
