/**
 * Premium Cache Layer — Upstash Redis
 * Sub-millisecond caching for all external API responses.
 * Falls back to in-memory Map if Redis is not configured.
 */
import { Redis } from '@upstash/redis';

// ─── Initialize Redis ───────────────────────────────────
const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

let redis: Redis | null = null;

if (REDIS_URL && REDIS_TOKEN) {
  redis = new Redis({ url: REDIS_URL, token: REDIS_TOKEN });
  console.log('🔴 Upstash Redis connected — premium caching active');
} else {
  console.log('⚠️ No Redis configured — using in-memory cache (add UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN)');
}

// Fallback in-memory cache
const memCache = new Map<string, { value: string; expiry: number }>();

// ─── Cache Operations ───────────────────────────────────

export async function cacheGet<T = any>(key: string): Promise<T | null> {
  try {
    if (redis) {
      const val = await redis.get<T>(key);
      return val;
    }
    // In-memory fallback
    const entry = memCache.get(key);
    if (entry && Date.now() < entry.expiry) {
      return JSON.parse(entry.value) as T;
    }
    if (entry) memCache.delete(key);
    return null;
  } catch (err) {
    console.warn('[cache] GET error:', err);
    return null;
  }
}

export async function cacheSet(key: string, value: any, ttlSeconds: number): Promise<void> {
  try {
    if (redis) {
      await redis.set(key, JSON.stringify(value), { ex: ttlSeconds });
      return;
    }
    // In-memory fallback
    memCache.set(key, { value: JSON.stringify(value), expiry: Date.now() + ttlSeconds * 1000 });
  } catch (err) {
    console.warn('[cache] SET error:', err);
  }
}

export async function cacheDel(key: string): Promise<void> {
  try {
    if (redis) {
      await redis.del(key);
      return;
    }
    memCache.delete(key);
  } catch {}
}

// ─── Rate Limiter (Redis-backed) ────────────────────────
export async function checkRateLimit(key: string, maxRequests: number, windowSeconds: number): Promise<{
  allowed: boolean;
  remaining: number;
  resetAt: number;
}> {
  const rlKey = `rl:${key}`;

  if (redis) {
    try {
      const pipe = redis.pipeline();
      pipe.incr(rlKey);
      pipe.ttl(rlKey);
      const results = await pipe.exec<[number, number]>();
      const count = results[0] as number;
      const ttl = results[1] as number;

      if (ttl === -1) {
        await redis.expire(rlKey, windowSeconds);
      }

      return {
        allowed: count <= maxRequests,
        remaining: Math.max(0, maxRequests - count),
        resetAt: Date.now() + (ttl > 0 ? ttl * 1000 : windowSeconds * 1000),
      };
    } catch {
      return { allowed: true, remaining: maxRequests, resetAt: Date.now() + windowSeconds * 1000 };
    }
  }

  // In-memory fallback
  const now = Date.now();
  const entry = memCache.get(rlKey);
  if (entry && now < entry.expiry) {
    const count = parseInt(entry.value) + 1;
    memCache.set(rlKey, { value: String(count), expiry: entry.expiry });
    return {
      allowed: count <= maxRequests,
      remaining: Math.max(0, maxRequests - count),
      resetAt: entry.expiry,
    };
  }
  memCache.set(rlKey, { value: '1', expiry: now + windowSeconds * 1000 });
  return { allowed: true, remaining: maxRequests - 1, resetAt: now + windowSeconds * 1000 };
}

// ─── Periodic cache cleanup (in-memory only) ────────────
setInterval(() => {
  if (redis) return; // Redis handles TTL natively
  const now = Date.now();
  for (const [key, entry] of memCache.entries()) {
    if (now >= entry.expiry) memCache.delete(key);
  }
}, 30_000);

export { redis };
