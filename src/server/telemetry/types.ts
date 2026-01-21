import type { Audience, Length, Tone } from '../../shared/contracts';

/**
 * Base fields present on all telemetry events.
 */
export interface TelemetryEventBase {
  /** ISO-8601 timestamp */
  timestamp: string;
  /** Event type discriminator */
  event: TelemetryEventType;
  /** SHA-256 hash of client IP (first 12 chars) for abuse tracking */
  hashedClientId: string;
  /** Unique request ID for correlation */
  requestId: string;
}

export type TelemetryEventType =
  | 'generate.success'
  | 'generate.error'
  | 'generate.rate_limited';

/**
 * Request metadata - captured at request start.
 * PRIVACY: No rawInput content, only lengths.
 */
export interface RequestMetrics {
  /** Total character count of rawInput */
  inputLength: number;
  /** Count of alphanumeric chars (meaningful content) */
  meaningfulCharCount: number;
  /** User-selected settings */
  settings: {
    audience: Audience;
    length: Length;
    tone: Tone;
  };
}

/**
 * Performance metrics - captured during/after generation.
 */
export interface PerformanceMetrics {
  /** Total request duration in ms */
  durationMs: number;
  /** Token budget based on length setting */
  tokenBudget: number;
  /** Actual tokens used (from Anthropic API, if available) */
  tokenUsage?: {
    inputTokens: number;
    outputTokens: number;
  };
}

/**
 * Validation metrics - captured after output validation.
 * PRIVACY: No actual warning text, only counts.
 */
export interface ValidationMetrics {
  /** Whether metrics were detected in input */
  metricsDetected: boolean;
  /** Count of validation warnings (not the warnings themselves) */
  validationWarningCount: number;
}

/**
 * Outcome metrics - final request outcome.
 * PRIVACY: No markdown content, only length.
 */
export interface OutcomeMetrics {
  /** HTTP status code */
  statusCode: number;
  /** Error code if request failed */
  errorCode?: string;
  /** Length of generated markdown (not the content) */
  outputLength: number;
}

/**
 * Rate limiting context.
 */
export interface RateLimitMetrics {
  /** Whether this request was rate limited */
  wasRateLimited: boolean;
  /** Remaining requests in window (for successful requests) */
  remainingRequests?: number;
  /** Which limit was hit: 'ip' | 'global' */
  limitType?: 'ip' | 'global';
}

/**
 * Complete telemetry event for successful generation.
 */
export interface GenerateSuccessEvent extends TelemetryEventBase {
  event: 'generate.success';
  request: RequestMetrics;
  performance: PerformanceMetrics;
  validation: ValidationMetrics;
  outcome: OutcomeMetrics;
  rateLimit: RateLimitMetrics;
  provider: {
    name: string;
    model?: string;
  };
}

/**
 * Error categories for aggregation (not the message).
 */
export type ErrorCategory = 'validation' | 'rate_limit' | 'provider' | 'internal';

/**
 * Telemetry event for failed generation.
 */
export interface GenerateErrorEvent extends TelemetryEventBase {
  event: 'generate.error';
  request?: Partial<RequestMetrics>;
  performance?: Partial<PerformanceMetrics>;
  outcome: {
    statusCode: number;
    errorCode: string;
    errorCategory: ErrorCategory;
  };
  rateLimit: RateLimitMetrics;
}

/**
 * Telemetry event specifically for rate limiting (quick path).
 */
export interface GenerateRateLimitedEvent extends TelemetryEventBase {
  event: 'generate.rate_limited';
  rateLimit: {
    wasRateLimited: true;
    limitType: 'ip' | 'global' | 'kill_switch';
    /** Seconds until reset (from Retry-After header) */
    retryAfterSeconds?: number;
  };
}

export type TelemetryEvent =
  | GenerateSuccessEvent
  | GenerateErrorEvent
  | GenerateRateLimitedEvent;
