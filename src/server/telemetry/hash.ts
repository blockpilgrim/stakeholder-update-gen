import { createHash } from 'crypto';

/**
 * Hash client identifier for privacy-safe abuse tracking.
 * Uses SHA-256 and truncates to 12 characters.
 *
 * The salt prevents rainbow table attacks while remaining
 * consistent across requests for the same IP.
 */
export function hashClientId(ip: string): string {
  const salt = process.env.TELEMETRY_SALT ?? 'sug-telemetry-v1';
  const hash = createHash('sha256').update(`${salt}:${ip}`).digest('hex');

  // First 12 chars = 48 bits of entropy, sufficient for abuse tracking
  return hash.slice(0, 12);
}

/**
 * Generate a unique request ID for log correlation.
 * Format: timestamp-random (e.g., "1705847234567-a3f2b1")
 */
export function generateRequestId(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).slice(2, 8);
  return `${timestamp}-${random}`;
}
