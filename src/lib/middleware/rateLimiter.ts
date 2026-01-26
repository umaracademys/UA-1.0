import type { NextApiRequest, NextApiResponse } from "next";

type RateLimitConfig = {
  windowMs: number;
  max: number;
};

type RateLimitEntry = {
  count: number;
  expiresAt: number;
};

type Store = {
  get(key: string): Promise<RateLimitEntry | null>;
  set(key: string, value: RateLimitEntry): Promise<void>;
  increment(key: string, ttlMs: number): Promise<RateLimitEntry>;
};

class MemoryStore implements Store {
  private store = new Map<string, RateLimitEntry>();

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async set(key: string, value: RateLimitEntry) {
    this.store.set(key, value);
  }

  async increment(key: string, ttlMs: number) {
    const now = Date.now();
    const entry = await this.get(key);
    if (!entry) {
      const fresh = { count: 1, expiresAt: now + ttlMs };
      await this.set(key, fresh);
      return fresh;
    }

    entry.count += 1;
    return entry;
  }
}

const createStore = (): Store => {
  if (process.env.NODE_ENV === "production" && process.env.REDIS_URL) {
    try {
      // Optional dependency: ioredis or redis client can be wired here.
      const Redis = require("ioredis");
      const client = new Redis(process.env.REDIS_URL);

      return {
        async get(key: string) {
          const value = await client.get(key);
          return value ? (JSON.parse(value) as RateLimitEntry) : null;
        },
        async set(key: string, value: RateLimitEntry) {
          const ttl = Math.max(1, Math.ceil((value.expiresAt - Date.now()) / 1000));
          await client.set(key, JSON.stringify(value), "EX", ttl);
        },
        async increment(key: string, ttlMs: number) {
          const current = await this.get(key);
          if (!current) {
            const fresh = { count: 1, expiresAt: Date.now() + ttlMs };
            await this.set(key, fresh);
            return fresh;
          }
          current.count += 1;
          await this.set(key, current);
          return current;
        },
      };
    } catch {
      return new MemoryStore();
    }
  }

  return new MemoryStore();
};

const store = createStore();

const getClientKey = (req: NextApiRequest) =>
  (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim() ??
  req.socket.remoteAddress ??
  "unknown";

const createRateLimiter = (config: RateLimitConfig) => {
  return async (req: NextApiRequest, res: NextApiResponse, next: () => void) => {
    const key = getClientKey(req);
    const entry = await store.increment(key, config.windowMs);

    if (entry.count > config.max) {
      const retryAfter = Math.ceil((entry.expiresAt - Date.now()) / 1000);
      res.setHeader("Retry-After", retryAfter);
      res.status(429).json({ message: "Too many requests. Please try again later." });
      return;
    }

    next();
  };
};

export const loginRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 5 });
export const apiRateLimiter = createRateLimiter({ windowMs: 15 * 60 * 1000, max: 100 });
export const messageRateLimiter = createRateLimiter({ windowMs: 60 * 60 * 1000, max: 50 });
