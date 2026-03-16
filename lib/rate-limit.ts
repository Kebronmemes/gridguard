// ============================================
// GridGuard — Rate Limiter (Serverless-Compatible)
// ============================================
// Token-bucket rate limiter using in-memory Map.
// Works on Vercel serverless (per-instance, resets on cold starts).

interface RateLimitEntry {
  tokens: number;
  lastRefill: number;
}

const store = new Map<string, RateLimitEntry>();

interface RateLimitConfig {
  maxTokens: number;     // max requests in the window
  refillRate: number;    // tokens refilled per second
  identifier: string;    // unique ID (IP, user ID, etc.)
}

export function checkRateLimit(config: RateLimitConfig): { allowed: boolean; remaining: number; retryAfter: number } {
  const { maxTokens, refillRate, identifier } = config;
  const now = Date.now();

  let entry = store.get(identifier);
  if (!entry) {
    entry = { tokens: maxTokens - 1, lastRefill: now };
    store.set(identifier, entry);
    return { allowed: true, remaining: maxTokens - 1, retryAfter: 0 };
  }

  // Refill tokens based on elapsed time
  const elapsed = (now - entry.lastRefill) / 1000;
  entry.tokens = Math.min(maxTokens, entry.tokens + elapsed * refillRate);
  entry.lastRefill = now;

  if (entry.tokens >= 1) {
    entry.tokens -= 1;
    store.set(identifier, entry);
    return { allowed: true, remaining: Math.floor(entry.tokens), retryAfter: 0 };
  }

  // Rate limited
  const retryAfter = Math.ceil((1 - entry.tokens) / refillRate);
  return { allowed: false, remaining: 0, retryAfter };
}

// Preset rate limit configs
export const RATE_LIMITS = {
  // Auth: 5 attempts per minute
  auth: (ip: string) => checkRateLimit({ maxTokens: 5, refillRate: 5 / 60, identifier: `auth:${ip}` }),
  // Reports: 3 per minute per IP
  report: (ip: string) => checkRateLimit({ maxTokens: 3, refillRate: 3 / 60, identifier: `report:${ip}` }),
  // Subscribe: 2 per minute per IP
  subscribe: (ip: string) => checkRateLimit({ maxTokens: 2, refillRate: 2 / 60, identifier: `sub:${ip}` }),
  // General API: 30 per minute per IP
  api: (ip: string) => checkRateLimit({ maxTokens: 30, refillRate: 30 / 60, identifier: `api:${ip}` }),
};

// Cleanup old entries periodically (prevent memory leak)
setInterval(() => {
  const now = Date.now();
  const MAX_AGE = 10 * 60 * 1000; // 10 minutes
  const keys = Array.from(store.keys());
  for (const key of keys) {
    const entry = store.get(key);
    if (entry && now - entry.lastRefill > MAX_AGE) {
      store.delete(key);
    }
  }
}, 60000);

// Helper: get client IP from request
export function getClientIP(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || '127.0.0.1';
}
