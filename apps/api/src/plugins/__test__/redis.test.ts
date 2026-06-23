import { describe, it, expect, beforeEach, vi } from "vitest";
import { RedisPlugin } from "../redis.js";
import { Redis } from "ioredis";

vi.mock("ioredis", () => ({
  Redis: vi.fn(),
}));

vi.mock("../../utils/env.js", () => ({
  EnvUtils: {
    variables: {
      REDIS_URL: "redis://localhost:6379",
      PORT: 3000,
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_WINDOW_MS: 60000,
      TRANSLATE_SERVICE_URL: "http://localhost:8000",
      NODE_ENV: "development",
    },
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

const mockRedisInstance = {
  on: vi.fn(),
  quit: vi.fn(),
  disconnect: vi.fn(),
  ping: vi.fn(),
  get: vi.fn(),
  set: vi.fn(),
  del: vi.fn(),
  exists: vi.fn(),
  keys: vi.fn(),
};

describe("RedisPlugin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Redis).mockImplementation(() => mockRedisInstance as unknown as Redis);
  });

  describe("Instance", () => {
    it("creates a Redis connection and registers event handlers", async () => {
      const plugin = await RedisPlugin.Instance();

      expect(Redis).toHaveBeenCalledWith("redis://localhost:6379");
      expect(mockRedisInstance.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockRedisInstance.on).toHaveBeenCalledWith("error", expect.any(Function));
      expect(plugin).toBeInstanceOf(RedisPlugin);
    });
  });

  describe("getClient", () => {
    it("returns the underlying Redis client", async () => {
      const plugin = await RedisPlugin.Instance();

      const client = await plugin.getClient();

      expect(client).toBe(mockRedisInstance);
    });
  });

  describe("closeClient", () => {
    it("calls quit on the Redis client", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.quit).mockResolvedValue("OK");

      const result = await plugin.closeClient();

      expect(mockRedisInstance.quit).toHaveBeenCalledTimes(1);
      expect(result).toBe("OK");
    });
  });

  describe("disconnect", () => {
    it("calls disconnect on the Redis client", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.disconnect).mockResolvedValue();

      await plugin.disconnect();

      expect(mockRedisInstance.disconnect).toHaveBeenCalledTimes(1);
    });
  });

  describe("ping", () => {
    it("calls ping on the Redis client", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.ping).mockResolvedValue("PONG");

      const result = await plugin.ping();

      expect(mockRedisInstance.ping).toHaveBeenCalledTimes(1);
      expect(result).toBe("PONG");
    });
  });

  describe("get", () => {
    it("calls get on the Redis client and returns the value", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.get).mockResolvedValue("some-value");

      const result = await plugin.get("my-key");

      expect(mockRedisInstance.get).toHaveBeenCalledWith("my-key");
      expect(result).toBe("some-value");
    });

    it("returns null when the key does not exist", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.get).mockResolvedValue(null);

      const result = await plugin.get("missing-key");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("calls set on the Redis client and returns the result", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.set).mockResolvedValue("OK");

      const result = await plugin.set("my-key", "my-value");

      expect(mockRedisInstance.set).toHaveBeenCalledWith("my-key", "my-value");
      expect(result).toBe("OK");
    });
  });

  describe("del", () => {
    it("calls del on the Redis client and returns the number of deleted keys", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.del).mockResolvedValue(1);

      const result = await plugin.del("my-key");

      expect(mockRedisInstance.del).toHaveBeenCalledWith("my-key");
      expect(result).toBe(1);
    });
  });

  describe("exists", () => {
    it("calls exists on the Redis client and returns 1 for existing key", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.exists).mockResolvedValue(1);

      const result = await plugin.exists("my-key");

      expect(mockRedisInstance.exists).toHaveBeenCalledWith("my-key");
      expect(result).toBe(1);
    });

    it("returns 0 for a non-existing key", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.exists).mockResolvedValue(0);

      const result = await plugin.exists("missing-key");

      expect(result).toBe(0);
    });
  });

  describe("keys", () => {
    it("calls keys on the Redis client and returns matching keys", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.keys).mockResolvedValue(["key1", "key2"]);

      const result = await plugin.keys("transyn:*");

      expect(mockRedisInstance.keys).toHaveBeenCalledWith("transyn:*");
      expect(result).toEqual(["key1", "key2"]);
    });

    it("returns an empty array when no keys match", async () => {
      const plugin = await RedisPlugin.Instance();
      vi.mocked(mockRedisInstance.keys).mockResolvedValue([]);

      const result = await plugin.keys("nonexistent:*");

      expect(result).toEqual([]);
    });
  });
});
