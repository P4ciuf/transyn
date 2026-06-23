import { describe, it, expect, beforeEach, vi } from "vitest";
import { QueuePlugin, type TranslationJobData, type TranslationResult, type QueueStats } from "../bullmq.js";
import { Queue } from "bullmq";
import { RedisPlugin } from "../redis.js";

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
}));

vi.mock("../redis.js", () => ({
  RedisPlugin: {
    Instance: vi.fn(),
  },
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

const mockRedisClient = {
  lpush: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
};

let mockRedisPlugin: RedisPlugin;
let mockQueueInstance: {
  add: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  getWaitingCount: ReturnType<typeof vi.fn>;
  getActiveCount: ReturnType<typeof vi.fn>;
  getCompletedCount: ReturnType<typeof vi.fn>;
  getFailedCount: ReturnType<typeof vi.fn>;
};

describe("QueuePlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockRedisPlugin = {
      getClient: vi.fn().mockResolvedValue(mockRedisClient),
    } as unknown as RedisPlugin;

    mockQueueInstance = {
      add: vi.fn(),
      close: vi.fn(),
      getWaitingCount: vi.fn(),
      getActiveCount: vi.fn(),
      getCompletedCount: vi.fn(),
      getFailedCount: vi.fn(),
    };

    vi.mocked(RedisPlugin.Instance).mockResolvedValue(mockRedisPlugin);
    vi.mocked(Queue).mockImplementation(() => mockQueueInstance as unknown as Queue);
    vi.stubGlobal("crypto", {
      randomUUID: () => "mock-uuid-1234",
    });
    vi.stubEnv("NODE_ENV", "test");
  });

  describe("init", () => {
    it("creates a QueuePlugin with a Queue instance and RedisPlugin", async () => {
      const plugin = await QueuePlugin.init();

      expect(RedisPlugin.Instance).toHaveBeenCalledTimes(1);
      expect(Queue).toHaveBeenCalledWith("translate", {
        connection: mockRedisClient,
      });
      expect(plugin).toBeInstanceOf(QueuePlugin);
    });
  });

  describe("submitTranslation", () => {
    it("enqueues a translation job and returns the job data", async () => {
      const plugin = await QueuePlugin.init();
      vi.mocked(mockRedisClient.lpush).mockResolvedValue(1);

      const result = await plugin.submitTranslation("Hello", "fr", "en");

      const expectedJobData: TranslationJobData = {
        id: "mock-uuid-1234",
        text: "Hello",
        targetLang: "fr",
        sourceLang: "en",
      };

      expect(mockRedisClient.lpush).toHaveBeenCalledWith(
        "transyn:jobs",
        JSON.stringify(expectedJobData),
      );
      expect(mockQueueInstance.add).toHaveBeenCalledWith("translate", expectedJobData, {
        jobId: "mock-uuid-1234",
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      });
      expect(result).toEqual(expectedJobData);
    });

    it("handles submission without optional sourceLang", async () => {
      const plugin = await QueuePlugin.init();
      vi.mocked(mockRedisClient.lpush).mockResolvedValue(1);

      const result = await plugin.submitTranslation("Hola", "en");

      expect(result.sourceLang).toBeUndefined();
      expect(result.text).toBe("Hola");
      expect(result.targetLang).toBe("en");
      expect(result.id).toBe("mock-uuid-1234");
    });
  });

  describe("waitForResult", () => {
    it("returns the parsed TranslationResult when the result is available", async () => {
      const plugin = await QueuePlugin.init();
      const translationResult: TranslationResult = {
        translatedText: "Bonjour",
        sourceLang: "en",
        targetLang: "fr",
      };
      vi.mocked(mockRedisClient.get).mockResolvedValue(JSON.stringify(translationResult));
      vi.mocked(mockRedisClient.del).mockResolvedValue(1);

      const result = await plugin.waitForResult("job-123", 1000);

      expect(result).toEqual(translationResult);
      expect(mockRedisClient.get).toHaveBeenCalledWith("transyn:result:job-123");
      expect(mockRedisClient.del).toHaveBeenCalledWith("transyn:result:job-123");
    });

    it("returns null when the result is not available within the timeout", async () => {
      const plugin = await QueuePlugin.init();
      vi.mocked(mockRedisClient.get).mockResolvedValue(null);

      const result = await plugin.waitForResult("job-123", 50);

      expect(result).toBeNull();
    });

    it("polls multiple times before timing out", async () => {
      const plugin = await QueuePlugin.init();
      vi.mocked(mockRedisClient.get)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValue(JSON.stringify({ translatedText: "Hola", sourceLang: "en", targetLang: "es" }));
      vi.mocked(mockRedisClient.del).mockResolvedValue(1);

      const result = await plugin.waitForResult("job-456", 500);

      expect(result).not.toBeNull();
      if (result) {
        expect(result.translatedText).toBe("Hola");
      }
      expect(mockRedisClient.get).toHaveBeenCalledTimes(3);
    });
  });

  describe("getStats", () => {
    it("returns aggregated queue statistics", async () => {
      const plugin = await QueuePlugin.init();
      vi.mocked(mockQueueInstance.getWaitingCount).mockResolvedValue(5);
      vi.mocked(mockQueueInstance.getActiveCount).mockResolvedValue(2);
      vi.mocked(mockQueueInstance.getCompletedCount).mockResolvedValue(100);
      vi.mocked(mockQueueInstance.getFailedCount).mockResolvedValue(3);

      const stats = await plugin.getStats();

      const expected: QueueStats = { waiting: 5, active: 2, completed: 100, failed: 3 };
      expect(stats).toEqual(expected);
    });
  });

  describe("close", () => {
    it("closes the underlying queue", async () => {
      const plugin = await QueuePlugin.init();

      await plugin.close();

      expect(mockQueueInstance.close).toHaveBeenCalledTimes(1);
    });
  });
});
