// src/lib/kv-adapter.ts
// Simple adapter to replace @vercel/kv with Upstash Redis client.
import { Redis } from '@upstash/redis';

const url = process.env.UPSTASH_REST_URL;
const token = process.env.UPSTASH_REST_TOKEN;

if (!url || !token) {
  // Allow app to start locally without Upstash; runtime calls will throw with helpful message.
  console.warn('UPSTASH_REST_URL or UPSTASH_REST_TOKEN not set. KV adapter will not be functional.');
}

const redis = new Redis({ url: url || '', token: token || '' });

export const kv = {
  async keys(pattern: string) {
    // Redis KEYS is blocking; for small datasets acceptable. For large sets consider SCAN.
    return (await redis.keys(pattern)) as string[];
  },

  async mget<T = any>(...keys: string[]) {
    if (!keys || keys.length === 0) return [] as (T | null)[];
    const results = await redis.mget(...keys);
    // Upstash returns raw strings or null
    return results.map((r: any) => {
      if (r == null) return null;
      if (typeof r === 'string') {
        try { return JSON.parse(r) as T; } catch { return r as T; }
      }
      return r as T;
    }) as (T | null)[];
  },

  async get<T = any>(key: string) {
    const res = await redis.get(key);
    if (res == null) return null;
    if (typeof res === 'string') {
      try { return JSON.parse(res) as T; } catch { return res as T; }
    }
    return res as T;
  },

  async set(key: string, value: any) {
    const stored = typeof value === 'string' ? value : JSON.stringify(value);
    await redis.set(key, stored);
    return true;
  },

  async del(key: string) {
    await redis.del(key);
    return true;
  }
};

export default kv;
