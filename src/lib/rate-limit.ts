interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

const CLEANUP_INTERVAL = 60_000;
let lastCleanup = Date.now();

function cleanup(windowMs: number) {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const cutoff = now - windowMs;
  store.forEach((entry, key) => {
    entry.timestamps = entry.timestamps.filter((t) => t > cutoff);
    if (entry.timestamps.length === 0) store.delete(key);
  });
}

export function rateLimit(key: string, maxAttempts: number, windowMs: number): { allowed: boolean; remaining: number } {
  cleanup(windowMs);
  const now = Date.now();
  const cutoff = now - windowMs;

  let entry = store.get(key);
  if (!entry) {
    entry = { timestamps: [] };
    store.set(key, entry);
  }

  entry.timestamps = entry.timestamps.filter((t) => t > cutoff);

  if (entry.timestamps.length >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }

  entry.timestamps.push(now);
  return { allowed: true, remaining: maxAttempts - entry.timestamps.length };
}

const lockoutStore = new Map<string, { failures: number[]; lockedUntil?: number }>();

export function checkLockout(email: string): { locked: boolean; retryAfterMs?: number } {
  const key = `lockout:${email.toLowerCase()}`;
  const entry = lockoutStore.get(key);
  if (!entry) return { locked: false };

  const now = Date.now();
  if (entry.lockedUntil && now < entry.lockedUntil) {
    return { locked: true, retryAfterMs: entry.lockedUntil - now };
  }

  if (entry.lockedUntil && now >= entry.lockedUntil) {
    lockoutStore.delete(key);
    return { locked: false };
  }

  return { locked: false };
}

export function recordFailedLogin(email: string): void {
  const key = `lockout:${email.toLowerCase()}`;
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxFailures = 5;
  const lockoutMs = 15 * 60 * 1000; // 15 minutes

  let entry = lockoutStore.get(key);
  if (!entry) {
    entry = { failures: [] };
    lockoutStore.set(key, entry);
  }

  entry.failures = entry.failures.filter((t) => t > now - windowMs);
  entry.failures.push(now);

  if (entry.failures.length >= maxFailures) {
    entry.lockedUntil = now + lockoutMs;
  }
}

export function clearLockout(email: string): void {
  lockoutStore.delete(`lockout:${email.toLowerCase()}`);
}
