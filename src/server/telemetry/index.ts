import { config } from '../config';
import type {
  TelemetryEvent,
  GenerateSuccessEvent,
  GenerateErrorEvent,
  GenerateRateLimitedEvent,
  RequestMetrics,
  PerformanceMetrics,
  ValidationMetrics,
  OutcomeMetrics,
  RateLimitMetrics,
  ErrorCategory
} from './types';
import { hashClientId, generateRequestId } from './hash';
import { logStructuredEvent, logTelemetryError } from './logger';

// Re-export types for consumers
export type {
  TelemetryEvent,
  RequestMetrics,
  PerformanceMetrics,
  ValidationMetrics,
  OutcomeMetrics,
  RateLimitMetrics,
  ErrorCategory
};
export { generateRequestId };

/**
 * Check if telemetry is enabled.
 */
export function isTelemetryEnabled(): boolean {
  return config.telemetryEnabled;
}

/**
 * Create a telemetry context for a request.
 * Call this at the start of request handling.
 */
export function createTelemetryContext(ip: string): TelemetryContext {
  return new TelemetryContext(ip);
}

/**
 * Telemetry context that accumulates metrics throughout request lifecycle.
 * This pattern allows metrics to be collected incrementally.
 */
export class TelemetryContext {
  readonly requestId: string;
  readonly hashedClientId: string;
  readonly startTime: number;

  private requestMetrics?: RequestMetrics;
  private performanceMetrics?: Partial<PerformanceMetrics>;
  private validationMetrics?: ValidationMetrics;
  private rateLimitMetrics: RateLimitMetrics = { wasRateLimited: false };

  constructor(ip: string) {
    this.requestId = generateRequestId();
    this.hashedClientId = hashClientId(ip);
    this.startTime = Date.now();
  }

  /**
   * Record request metrics (call after input validation).
   */
  setRequestMetrics(metrics: RequestMetrics): void {
    this.requestMetrics = metrics;
  }

  /**
   * Record performance metrics (call after LLM response).
   */
  setPerformanceMetrics(metrics: Partial<PerformanceMetrics>): void {
    this.performanceMetrics = metrics;
  }

  /**
   * Record validation metrics (call after output validation).
   */
  setValidationMetrics(metrics: ValidationMetrics): void {
    this.validationMetrics = metrics;
  }

  /**
   * Record rate limit state.
   */
  setRateLimitMetrics(metrics: RateLimitMetrics): void {
    this.rateLimitMetrics = metrics;
  }

  /**
   * Emit a success event.
   */
  emitSuccess(
    outcome: OutcomeMetrics,
    provider: { name: string; model?: string }
  ): void {
    if (!isTelemetryEnabled()) return;

    try {
      const event: GenerateSuccessEvent = {
        timestamp: new Date().toISOString(),
        event: 'generate.success',
        hashedClientId: this.hashedClientId,
        requestId: this.requestId,
        request: this.requestMetrics!,
        performance: {
          durationMs: Date.now() - this.startTime,
          tokenBudget: this.performanceMetrics?.tokenBudget ?? 0,
          tokenUsage: this.performanceMetrics?.tokenUsage
        },
        validation: this.validationMetrics!,
        outcome,
        rateLimit: this.rateLimitMetrics,
        provider
      };

      logStructuredEvent(event);
    } catch (err) {
      logTelemetryError(err, 'emitSuccess');
    }
  }

  /**
   * Emit an error event.
   */
  emitError(statusCode: number, errorCode: string, errorCategory: ErrorCategory): void {
    if (!isTelemetryEnabled()) return;

    try {
      const event: GenerateErrorEvent = {
        timestamp: new Date().toISOString(),
        event: 'generate.error',
        hashedClientId: this.hashedClientId,
        requestId: this.requestId,
        request: this.requestMetrics,
        performance: this.performanceMetrics
          ? {
              durationMs: Date.now() - this.startTime,
              ...this.performanceMetrics
            }
          : undefined,
        outcome: {
          statusCode,
          errorCode,
          errorCategory
        },
        rateLimit: this.rateLimitMetrics
      };

      logStructuredEvent(event);
    } catch (err) {
      logTelemetryError(err, 'emitError');
    }
  }

  /**
   * Emit a rate-limited event (fast path for early rejection).
   */
  emitRateLimited(
    limitType: 'ip' | 'global' | 'kill_switch',
    retryAfterSeconds?: number
  ): void {
    if (!isTelemetryEnabled()) return;

    try {
      const event: GenerateRateLimitedEvent = {
        timestamp: new Date().toISOString(),
        event: 'generate.rate_limited',
        hashedClientId: this.hashedClientId,
        requestId: this.requestId,
        rateLimit: {
          wasRateLimited: true,
          limitType,
          retryAfterSeconds
        }
      };

      logStructuredEvent(event);
    } catch (err) {
      logTelemetryError(err, 'emitRateLimited');
    }
  }
}
