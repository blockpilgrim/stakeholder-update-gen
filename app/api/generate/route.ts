import { GenerateRequestSchema } from '../../../src/shared/contracts';
import { isApiError } from '../../../src/server/errors';
import { generateUpdate, maxTokensForLength } from '../../../src/server/generateUpdate';
import { checkGuardrails } from '../../../src/server/guardrails';
import { createTelemetryContext, type ErrorCategory } from '../../../src/server/telemetry';

function categorizeError(code: string): ErrorCategory {
  if (code === 'rate_limited' || code === 'daily_limit_reached') return 'rate_limit';
  if (code.startsWith('provider_') || code === 'empty_output') return 'provider';
  return 'internal';
}

export async function POST(req: Request) {
  // Extract client IP for rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  // Create telemetry context at request start
  const telemetry = createTelemetryContext(ip);

  // Check guardrails before any processing
  const guardrailResult = checkGuardrails(ip);
  if (!guardrailResult.ok) {
    // Determine limit type for telemetry
    const limitType =
      guardrailResult.code === 'generation_disabled'
        ? 'kill_switch'
        : guardrailResult.code === 'rate_limited'
          ? 'ip'
          : 'global';

    const retryAfterSeconds = guardrailResult.headers?.['Retry-After']
      ? parseInt(guardrailResult.headers['Retry-After'], 10)
      : undefined;

    telemetry.emitRateLimited(limitType, retryAfterSeconds);

    return Response.json(
      { error: guardrailResult.message, code: guardrailResult.code },
      { status: guardrailResult.status, headers: guardrailResult.headers }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    telemetry.emitError(400, 'invalid_json', 'validation');
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first
      ? `${first.path.length ? first.path.join('.') : 'request'}: ${first.message}`
      : 'invalid request';

    telemetry.emitError(400, 'validation_failed', 'validation');
    return Response.json(
      {
        error: message,
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
      },
      { status: 400 }
    );
  }

  const meaningfulChars = parsed.data.rawInput.match(/[A-Za-z0-9]/g)?.length ?? 0;

  // Set request metrics for telemetry
  telemetry.setRequestMetrics({
    inputLength: parsed.data.rawInput.length,
    meaningfulCharCount: meaningfulChars,
    settings: parsed.data.settings
  });

  if (meaningfulChars < 8) {
    telemetry.emitError(400, 'input_too_short', 'validation');
    return Response.json({ error: 'rawInput is too empty' }, { status: 400 });
  }

  // Set performance metrics (token budget)
  telemetry.setPerformanceMetrics({
    tokenBudget: maxTokensForLength(parsed.data.settings.length)
  });

  try {
    const result = await generateUpdate(parsed.data);

    // Update performance metrics with token usage if available
    if (result.meta?.tokenUsage) {
      telemetry.setPerformanceMetrics({
        tokenBudget: maxTokensForLength(parsed.data.settings.length),
        tokenUsage: result.meta.tokenUsage
      });
    }

    // Set validation metrics
    telemetry.setValidationMetrics({
      metricsDetected: result._telemetry.metricsDetected,
      validationWarningCount: result.warnings?.length ?? 0
    });

    // Emit success event
    telemetry.emitSuccess(
      {
        statusCode: 200,
        outputLength: result.markdown.length
      },
      {
        name: result.meta?.provider ?? 'unknown',
        model: result.meta?.model
      }
    );

    // Strip _telemetry before returning to client
    const { _telemetry, ...response } = result;
    return Response.json(response, { status: 200 });
  } catch (err) {
    if (isApiError(err)) {
      telemetry.emitError(err.status, err.code, categorizeError(err.code));
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    telemetry.emitError(500, 'internal_error', 'internal');
    return Response.json({ error: 'generation failed' }, { status: 500 });
  }
}
