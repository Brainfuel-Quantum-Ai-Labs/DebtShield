interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

function cleanupExpired(now: number) {
  store.forEach((entry, key) => {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  })
}

/**
 * Simple in-memory rate limiter for MVP use.
 * @param key Identifier (e.g. userId or IP)
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
  // Clean up expired entries on demand to prevent unbounded memory growth
  if (store.size > 1000) cleanupExpired(now)
  const entry = store.get(key)

  if (!entry || now > entry.resetAt) {
    store.set(key, { count: 1, resetAt: now + windowMs })
    return true
  }

  if (entry.count >= limit) {
    return false
  }

  entry.count++
  return true
}
