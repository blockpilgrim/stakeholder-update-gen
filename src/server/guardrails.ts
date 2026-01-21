/**
 * Orchestrates all guardrail checks before allowing generation.
 * Checks are performed in order, failing fast on first rejection.
 */

import { config } from './config';
import { rateLimiter } from './rateLimit';

export type GuardrailResult =
  | { ok: true }
  | {
      ok: false;
      status: number;
      code: string;
      message: string;
      headers?: Record<string, string>;
    };

/**
 * Run all guardrail checks for a generation request.
 *
 * Order of checks:
 * 1. Kill switch - is generation enabled?
 * 2. Per-IP rate limit - has this IP exceeded their quota?
 * 3. Global daily limit - has the daily cap been reached?
 *
 * @param ip - Client IP address for rate limiting
 * @returns Result indicating if the request should proceed
 */
export function checkGuardrails(ip: string): GuardrailResult {
  // 1. Kill switch check
  if (!config.generationEnabled) {
    return {
      ok: false,
      status: 503,
      code: 'generation_disabled',
      message: 'live generation is temporarily disabled',
    };
  }

  // 2. Per-IP rate limit
  const ipResult = rateLimiter.checkIpLimit(ip);
  if (!ipResult.allowed) {
    const retryAfter = Math.max(1, ipResult.resetAt - Math.floor(Date.now() / 1000));
    return {
      ok: false,
      status: 429,
      code: 'rate_limited',
      message: 'too many requests, please wait before trying again',
      headers: { 'Retry-After': String(retryAfter) },
    };
  }

  // 3. Global daily limit
  const globalResult = rateLimiter.checkGlobalDaily();
  if (!globalResult.allowed) {
    return {
      ok: false,
      status: 429,
      code: 'daily_limit_reached',
      message: 'daily usage limit reached, please try again tomorrow',
    };
  }

  return { ok: true };
}
