import type { TelemetryEvent } from './types';

/**
 * Structured JSON logger for telemetry events.
 *
 * Design decisions:
 * - Uses console.log with JSON.stringify for maximum compatibility
 * - Can be piped to any log aggregator (CloudWatch, Datadog, etc.)
 * - No external dependencies
 * - Synchronous to avoid blocking issues
 */
export function logStructuredEvent(event: TelemetryEvent): void {
  // Single-line JSON for log aggregator compatibility
  const output = JSON.stringify({
    ...event,
    _telemetry: 'sug-v1' // Version marker for log parsing
  });

  console.log(output);
}

/**
 * Log a telemetry error (e.g., if event construction fails).
 * This should rarely happen but provides observability.
 */
export function logTelemetryError(error: unknown, context: string): void {
  console.error(
    JSON.stringify({
      _telemetry: 'sug-v1',
      event: 'telemetry.error',
      timestamp: new Date().toISOString(),
      context,
      error: error instanceof Error ? error.message : String(error)
    })
  );
}
