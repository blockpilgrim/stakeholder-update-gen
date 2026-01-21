/**
 * In-memory rate limiter with sliding window counters.
 * Supports per-IP limits and global daily caps.
 *
 * Note: State is lost on server restart. For production with multiple
 * instances, swap this for Redis/Upstash implementation.
 */

import { config } from './config';

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number; // Unix timestamp in seconds
}

interface Bucket {
  count: number;
  resetAt: number;
}

class InMemoryRateLimiter {
  private ipBuckets = new Map<string, Bucket>();
  private globalBucket: Bucket = { count: 0, resetAt: this.getNextMidnight() };
  private lastCleanup = Date.now();
  private readonly cleanupIntervalMs = 60_000; // Clean up every minute

  /**
   * Check if a request from this IP is allowed.
   */
  checkIpLimit(ip: string): RateLimitResult {
    this.maybeCleanup();

    const now = Date.now();
    const windowEnd = now + config.rateLimitWindowMs;
    const resetAtSeconds = Math.ceil(windowEnd / 1000);

    let bucket = this.ipBuckets.get(ip);

    // Reset bucket if window has passed
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: windowEnd };
      this.ipBuckets.set(ip, bucket);
    }

    const allowed = bucket.count < config.rateLimitPerIp;
    if (allowed) {
      bucket.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, config.rateLimitPerIp - bucket.count),
      resetAt: Math.ceil(bucket.resetAt / 1000),
    };
  }

  /**
   * Check if the global daily limit has been reached.
   */
  checkGlobalDaily(): RateLimitResult {
    const now = Date.now();

    // Reset at midnight
    if (this.globalBucket.resetAt <= now) {
      this.globalBucket = { count: 0, resetAt: this.getNextMidnight() };
    }

    const allowed = this.globalBucket.count < config.rateLimitGlobalDaily;
    if (allowed) {
      this.globalBucket.count++;
    }

    return {
      allowed,
      remaining: Math.max(0, config.rateLimitGlobalDaily - this.globalBucket.count),
      resetAt: Math.ceil(this.globalBucket.resetAt / 1000),
    };
  }

  /**
   * Get current usage stats (useful for monitoring/debugging).
   */
  getStats(): { ipBucketCount: number; globalCount: number; globalLimit: number } {
    return {
      ipBucketCount: this.ipBuckets.size,
      globalCount: this.globalBucket.count,
      globalLimit: config.rateLimitGlobalDaily,
    };
  }

  private getNextMidnight(): number {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  private maybeCleanup(): void {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupIntervalMs) return;

    this.lastCleanup = now;
    for (const [ip, bucket] of this.ipBuckets) {
      if (bucket.resetAt <= now) {
        this.ipBuckets.delete(ip);
      }
    }
  }
}

// Singleton instance
export const rateLimiter = new InMemoryRateLimiter();
