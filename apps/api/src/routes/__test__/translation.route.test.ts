import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import type { FastifyRequest, FastifyReply } from "fastify";

const { mockQueueService } = vi.hoisted(() => ({
  mockQueueService: {
    submitTranslation: vi.fn(),
    waitForResult: vi.fn(),
  },
}));

vi.mock("../../services/bullmq.js", () => ({
  QueueService: {
    init: vi.fn().mockResolvedValue(mockQueueService),
  },
}));

import translationRoute from "../translation.route.js";
import type { FastifyInstance, RouteOptions } from "fastify";

describe("POST /translate", () => {
  let mockFastify: FastifyInstance;
  let route: RouteOptions;

  function buildMockReply(): { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> } {
    const send = vi.fn();
    const code = vi.fn().mockReturnValue({ send } as unknown as FastifyReply);
    return { code, send };
  }

  beforeEach(async () => {
    mockQueueService.submitTranslation.mockReset();
    mockQueueService.waitForResult.mockReset();

    const { QueueService } = await import("../../services/bullmq.js");
    vi.mocked(QueueService.init).mockResolvedValue(mockQueueService);

    mockFastify = {} as FastifyInstance;

    const factory = translationRoute;
    route = factory(mockFastify);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("route definition", () => {
    it("returns a POST route at /translate", () => {
      expect(route.method).toBe("POST");
      expect(route.url).toBe("/translate");
    });

    it("defines body schema requiring text and targetLanguage", () => {
      expect(route.schema).toBeDefined();
      const bodySchema = route.schema!.body as {
        type: string;
        required: string[];
        properties: Record<string, unknown>;
      };
      expect(bodySchema.type).toBe("object");
      expect(bodySchema.required).toEqual(["text", "targetLanguage"]);
      expect(bodySchema.properties).toHaveProperty("text");
      expect(bodySchema.properties).toHaveProperty("targetLanguage");
    });

    it("includes all supported language codes in the targetLanguage enum", () => {
      const bodySchema = route.schema!.body as {
        properties: Record<string, { type: string; enum?: string[] }>;
      };
      const langEnum = bodySchema.properties.targetLanguage.enum;

      expect(langEnum).toContain("en");
      expect(langEnum).toContain("fr");
      expect(langEnum).toContain("de");
      expect(langEnum).toContain("es");
      expect(langEnum).toContain("it");
    });
  });

  describe("handler", () => {
    let mockReply: { code: ReturnType<typeof vi.fn>; send: ReturnType<typeof vi.fn> };

    beforeEach(() => {
      mockReply = buildMockReply();
    });

    it("returns 200 with the translation result on success", async () => {
      const jobData = { id: "job-001", text: "Hello", targetLang: "fr" };
      const translationResult = { translatedText: "Bonjour", targetLang: "fr" };

      mockQueueService.submitTranslation.mockResolvedValue(jobData);
      mockQueueService.waitForResult.mockResolvedValue(translationResult);

      const request = {
        body: { text: "Hello", targetLanguage: "fr" },
      } as FastifyRequest;

      const handler = route.handler;
      await handler!.call(mockFastify, request, mockReply as unknown as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(translationResult);
    });

    it("calls submitTranslation with the correct text and targetLanguage", async () => {
      mockQueueService.submitTranslation.mockResolvedValue({
        id: "job-002",
        text: "Bonjour",
        targetLang: "en",
      });
      mockQueueService.waitForResult.mockResolvedValue({
        translatedText: "Hello",
        targetLang: "en",
      });

      const request = {
        body: { text: "Bonjour", targetLanguage: "en" },
      } as FastifyRequest;

      const handler = route.handler;
      await handler!.call(mockFastify, request, mockReply as unknown as FastifyReply);

      expect(mockQueueService.submitTranslation).toHaveBeenCalledWith("Bonjour", "en");
    });

    it("calls waitForResult with the job ID returned by submitTranslation", async () => {
      const jobData = { id: "job-003", text: "Ciao", targetLang: "it" };
      const translationResult = { translatedText: "Hello", targetLang: "it" };

      mockQueueService.submitTranslation.mockResolvedValue(jobData);
      mockQueueService.waitForResult.mockResolvedValue(translationResult);

      const request = {
        body: { text: "Ciao", targetLanguage: "it" },
      } as FastifyRequest;

      const handler = route.handler;
      await handler!.call(mockFastify, request, mockReply as unknown as FastifyReply);

      expect(mockQueueService.waitForResult).toHaveBeenCalledWith("job-003");
    });

    it("passes through a null result when waitForResult times out", async () => {
      const jobData = { id: "job-004", text: "Test", targetLang: "zh" };

      mockQueueService.submitTranslation.mockResolvedValue(jobData);
      mockQueueService.waitForResult.mockResolvedValue(null);

      const request = {
        body: { text: "Test", targetLanguage: "zh" },
      } as FastifyRequest;

      const handler = route.handler;
      await handler!.call(mockFastify, request, mockReply as unknown as FastifyReply);

      expect(mockReply.code).toHaveBeenCalledWith(200);
      expect(mockReply.send).toHaveBeenCalledWith(null);
    });

    it("rejects when submitTranslation fails", async () => {
      mockQueueService.submitTranslation.mockRejectedValue(new Error("Queue unavailable"));

      const request = {
        body: { text: "Fail", targetLanguage: "fr" },
      } as FastifyRequest;

      const handler = route.handler;
      await expect(
        handler!.call(mockFastify, request, mockReply as unknown as FastifyReply),
      ).rejects.toThrow("Queue unavailable");
    });

    it("rejects when waitForResult fails", async () => {
      mockQueueService.submitTranslation.mockResolvedValue({
        id: "job-005",
        text: "Error",
        targetLang: "de",
      });
      mockQueueService.waitForResult.mockRejectedValue(new Error("Redis down"));

      const request = {
        body: { text: "Error", targetLanguage: "de" },
      } as FastifyRequest;

      const handler = route.handler;
      await expect(
        handler!.call(mockFastify, request, mockReply as unknown as FastifyReply),
      ).rejects.toThrow("Redis down");
    });
  });
});
