import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

vi.mock("ioredis", () => ({
  Redis: vi.fn(),
}));

vi.mock("../../utils/logger.js", () => ({
  logger: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  },
}));

vi.mock("../../utils/env.js", () => ({
  EnvUtils: {
    checkVariables: vi.fn(),
    variables: {
      REDIS_URL: "redis://localhost:6379",
      PORT: 3000,
      RATE_LIMIT_MAX: 100,
      RATE_LIMIT_WINDOW_MS: 60000,
      TRANSLATE_SERVICE_URL: "http://localhost:8000",
      NODE_ENV: "test",
    },
  },
}));

import { RedisPlugin } from "../redis.js";

describe("RedisPlugin", () => {
  let mockClient: {
    on: ReturnType<typeof vi.fn>;
    quit: ReturnType<typeof vi.fn>;
    disconnect: ReturnType<typeof vi.fn>;
    ping: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    set: ReturnType<typeof vi.fn>;
    del: ReturnType<typeof vi.fn>;
    exists: ReturnType<typeof vi.fn>;
    keys: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    vi.clearAllMocks();

    mockClient = {
      on: vi.fn(),
      quit: vi.fn().mockResolvedValue("OK"),
      disconnect: vi.fn().mockResolvedValue(undefined),
      ping: vi.fn().mockResolvedValue("PONG"),
      get: vi.fn().mockResolvedValue(null),
      set: vi.fn().mockResolvedValue("OK"),
      del: vi.fn().mockResolvedValue(1),
      exists: vi.fn().mockResolvedValue(1),
      keys: vi.fn().mockResolvedValue(["key1", "key2"]),
    };

    const { Redis } = vi.mocked(await import("ioredis"));
    vi.mocked(Redis).mockReturnValue(mockClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Instance", () => {
    it("creates a new Redis client and registers event handlers", async () => {
      await RedisPlugin.Instance();

      expect(mockClient.on).toHaveBeenCalledWith("connect", expect.any(Function));
      expect(mockClient.on).toHaveBeenCalledWith("error", expect.any(Function));
    });

    it("returns a RedisPlugin instance", async () => {
      const instance = await RedisPlugin.Instance();
      expect(instance).toBeInstanceOf(RedisPlugin);
    });
  });

  describe("getClient", () => {
    it("returns the underlying ioredis client", async () => {
      const instance = await RedisPlugin.Instance();
      const client = await instance.getClient();
      expect(client).toBe(mockClient);
    });
  });

  describe("closeClient", () => {
    it("calls quit on the ioredis client and returns the result", async () => {
      mockClient.quit.mockResolvedValue("OK");
      const instance = await RedisPlugin.Instance();
      const result = await instance.closeClient();

      expect(mockClient.quit).toHaveBeenCalledOnce();
      expect(result).toBe("OK");
    });
  });

  describe("disconnect", () => {
    it("calls disconnect on the ioredis client", async () => {
      const instance = await RedisPlugin.Instance();
      await instance.disconnect();

      expect(mockClient.disconnect).toHaveBeenCalledOnce();
    });
  });

  describe("ping", () => {
    it("calls ping on the ioredis client and returns PONG", async () => {
      mockClient.ping.mockResolvedValue("PONG");
      const instance = await RedisPlugin.Instance();
      const result = await instance.ping();

      expect(mockClient.ping).toHaveBeenCalledOnce();
      expect(result).toBe("PONG");
    });
  });

  describe("get", () => {
    it("calls get on the ioredis client with the given key", async () => {
      mockClient.get.mockResolvedValue("some-value");
      const instance = await RedisPlugin.Instance();
      const result = await instance.get("mykey");

      expect(mockClient.get).toHaveBeenCalledWith("mykey");
      expect(result).toBe("some-value");
    });

    it("returns null when the key does not exist", async () => {
      mockClient.get.mockResolvedValue(null);
      const instance = await RedisPlugin.Instance();
      const result = await instance.get("nonexistent");

      expect(result).toBeNull();
    });
  });

  describe("set", () => {
    it("calls set on the ioredis client with key and value", async () => {
      mockClient.set.mockResolvedValue("OK");
      const instance = await RedisPlugin.Instance();
      const result = await instance.set("mykey", "myvalue");

      expect(mockClient.set).toHaveBeenCalledWith("mykey", "myvalue");
      expect(result).toBe("OK");
    });
  });

  describe("del", () => {
    it("calls del on the ioredis client and returns the count of deleted keys", async () => {
      mockClient.del.mockResolvedValue(1);
      const instance = await RedisPlugin.Instance();
      const result = await instance.del("mykey");

      expect(mockClient.del).toHaveBeenCalledWith("mykey");
      expect(result).toBe(1);
    });

    it("returns 0 when the key does not exist", async () => {
      mockClient.del.mockResolvedValue(0);
      const instance = await RedisPlugin.Instance();
      const result = await instance.del("nonexistent");

      expect(result).toBe(0);
    });
  });

  describe("exists", () => {
    it("calls exists on the ioredis client and returns 1 when the key exists", async () => {
      mockClient.exists.mockResolvedValue(1);
      const instance = await RedisPlugin.Instance();
      const result = await instance.exists("mykey");

      expect(mockClient.exists).toHaveBeenCalledWith("mykey");
      expect(result).toBe(1);
    });

    it("returns 0 when the key does not exist", async () => {
      mockClient.exists.mockResolvedValue(0);
      const instance = await RedisPlugin.Instance();
      const result = await instance.exists("nonexistent");

      expect(result).toBe(0);
    });
  });

  describe("keys", () => {
    it("calls keys on the ioredis client with the given pattern", async () => {
      mockClient.keys.mockResolvedValue(["transyn:jobs", "transyn:result:abc"]);
      const instance = await RedisPlugin.Instance();
      const result = await instance.keys("transyn:*");

      expect(mockClient.keys).toHaveBeenCalledWith("transyn:*");
      expect(result).toEqual(["transyn:jobs", "transyn:result:abc"]);
    });

    it("returns an empty array when no keys match", async () => {
      mockClient.keys.mockResolvedValue([]);
      const instance = await RedisPlugin.Instance();
      const result = await instance.keys("nonexistent:*");

      expect(result).toEqual([]);
    });
  });
});
