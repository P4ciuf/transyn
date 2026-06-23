import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

const { mockRedisClient, mockRedisPluginInstance } = vi.hoisted(() => ({
  mockRedisClient: {
    lpush: vi.fn(),
    get: vi.fn(),
    del: vi.fn(),
  },
  mockRedisPluginInstance: {
    getClient: vi.fn(),
  },
}));

vi.mock("bullmq", () => ({
  Queue: vi.fn(),
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../redis.js", () => ({
  RedisPlugin: {
    Instance: vi.fn().mockResolvedValue(mockRedisPluginInstance),
  },
}));

import { QueueService } from "../bullmq.js";
import type { TranslationJobData, TranslationResult } from "../../types/queue.js";

describe("QueueService", () => {
  let mockQueue: {
    add: ReturnType<typeof vi.fn>;
    close: ReturnType<typeof vi.fn>;
    getWaitingCount: ReturnType<typeof vi.fn>;
    getActiveCount: ReturnType<typeof vi.fn>;
    getCompletedCount: ReturnType<typeof vi.fn>;
    getFailedCount: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    mockRedisClient.lpush.mockReset();
    mockRedisClient.get.mockReset();
    mockRedisClient.del.mockReset();
    mockRedisPluginInstance.getClient.mockReset();

    mockRedisClient.lpush.mockResolvedValue(1);
    mockRedisClient.get.mockResolvedValue(null);
    mockRedisClient.del.mockResolvedValue(1);
    mockRedisPluginInstance.getClient.mockResolvedValue(mockRedisClient);

    mockQueue = {
      add: vi.fn().mockResolvedValue(undefined),
      close: vi.fn().mockResolvedValue(undefined),
      getWaitingCount: vi.fn().mockResolvedValue(2),
      getActiveCount: vi.fn().mockResolvedValue(1),
      getCompletedCount: vi.fn().mockResolvedValue(10),
      getFailedCount: vi.fn().mockResolvedValue(0),
    };

    const { Queue } = await import("bullmq");
    const { RedisPlugin } = await import("../redis.js");

    vi.mocked(Queue).mockClear().mockImplementation(() => mockQueue as unknown as InstanceType<typeof Queue>);
    vi.mocked(RedisPlugin.Instance).mockResolvedValue(mockRedisPluginInstance);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  describe("init", () => {
    it("creates a BullMQ queue and returns a QueueService instance", async () => {
      const service = await QueueService.init();
      expect(service).toBeInstanceOf(QueueService);
    });

    it("obtains the Redis client from RedisPlugin and passes it to the Queue constructor", async () => {
      const { RedisPlugin } = await import("../redis.js");
      const { Queue } = await import("bullmq");

      await QueueService.init();

      expect(RedisPlugin.Instance).toHaveBeenCalledOnce();
      expect(Queue).toHaveBeenCalledWith("translate", { connection: mockRedisClient });
    });
  });

  describe("submitTranslation", () => {
    it("generates a UUID and enqueues a translation job in Redis and BullMQ", async () => {
      const uuid = "550e8400-e29b-41d4-a716-446655440000";
      vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

      const service = await QueueService.init();
      const jobData = await service.submitTranslation("Hello", "fr");

      const expectedJob: TranslationJobData = { id: uuid, text: "Hello", targetLang: "fr" };

      expect(mockRedisClient.lpush).toHaveBeenCalledWith("transyn:jobs", JSON.stringify(expectedJob));
      expect(mockQueue.add).toHaveBeenCalledWith("translate", expectedJob, {
        jobId: uuid,
        removeOnComplete: { age: 3600 },
        removeOnFail: { age: 86400 },
      });
      expect(jobData).toEqual(expectedJob);
    });

    it("returns the job data with the generated UUID", async () => {
      const uuid = "660e8400-e29b-41d4-a716-446655440001";
      vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(uuid);

      const service = await QueueService.init();
      const result = await service.submitTranslation("Test", "de");

      expect(result.id).toBe(uuid);
      expect(result.text).toBe("Test");
      expect(result.targetLang).toBe("de");
    });
  });

  describe("waitForResult", () => {
    it("returns the translation result when it is immediately available", async () => {
      const resultData: TranslationResult = {
        translatedText: "Bonjour le monde",
        targetLang: "fr",
      };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(resultData));

      const service = await QueueService.init();
      const result = await service.waitForResult("job-001");

      expect(result).toEqual(resultData);
      expect(mockRedisClient.del).toHaveBeenCalledWith("transyn:result:job-001");
    });

    it("returns the translation result after a few polling attempts", async () => {
      vi.useFakeTimers();

      const resultData: TranslationResult = {
        translatedText: "Hola mundo",
        targetLang: "es",
      };
      mockRedisClient.get
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(JSON.stringify(resultData));

      const service = await QueueService.init();
      const resultPromise = service.waitForResult("job-002");

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toEqual(resultData);
      expect(mockRedisClient.get).toHaveBeenCalledTimes(3);
    });

    it("returns null when the timeout is reached", async () => {
      vi.useFakeTimers();

      mockRedisClient.get.mockResolvedValue(null);

      const service = await QueueService.init();
      const resultPromise = service.waitForResult("job-003", 1000);

      await vi.runAllTimersAsync();

      const result = await resultPromise;

      expect(result).toBeNull();
    });

    it("deletes the result key atomically after a successful read", async () => {
      const resultData: TranslationResult = {
        translatedText: "Guten Tag",
        targetLang: "de",
      };
      mockRedisClient.get.mockResolvedValueOnce(JSON.stringify(resultData));

      const service = await QueueService.init();
      await service.waitForResult("job-004");

      expect(mockRedisClient.del).toHaveBeenCalledWith("transyn:result:job-004");
    });
  });

  describe("getStats", () => {
    it("returns queue statistics across all job states", async () => {
      mockQueue.getWaitingCount.mockResolvedValue(2);
      mockQueue.getActiveCount.mockResolvedValue(1);
      mockQueue.getCompletedCount.mockResolvedValue(10);
      mockQueue.getFailedCount.mockResolvedValue(0);

      const service = await QueueService.init();
      const stats = await service.getStats();

      expect(stats).toEqual({
        waiting: 2,
        active: 1,
        completed: 10,
        failed: 0,
      });
    });

    it("reports zeroes when the queue is empty", async () => {
      mockQueue.getWaitingCount.mockResolvedValue(0);
      mockQueue.getActiveCount.mockResolvedValue(0);
      mockQueue.getCompletedCount.mockResolvedValue(0);
      mockQueue.getFailedCount.mockResolvedValue(0);

      const service = await QueueService.init();
      const stats = await service.getStats();

      expect(stats).toEqual({ waiting: 0, active: 0, completed: 0, failed: 0 });
    });
  });

  describe("close", () => {
    it("closes the BullMQ queue connection", async () => {
      const service = await QueueService.init();
      await service.close();

      expect(mockQueue.close).toHaveBeenCalledOnce();
    });
  });
});
