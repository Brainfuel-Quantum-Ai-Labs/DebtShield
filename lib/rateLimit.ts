interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

// Periodically clean up expired entries to prevent unbounded memory growth
setInterval(() => {
  const now = Date.now()
  store.forEach((entry, key) => {
    if (now > entry.resetAt) {
      store.delete(key)
    }
  })
}, 60_000)

/**
 * Simple in-memory rate limiter for MVP use.
 * @param key Identifier (e.g. userId or IP)
 * @param limit Max requests per window
 * @param windowMs Window duration in milliseconds
 * @returns true if allowed, false if rate limited
 */
export function checkRateLimit(key: string, limit = 10, windowMs = 60_000): boolean {
  const now = Date.now()
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
