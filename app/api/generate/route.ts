import { GenerateRequestSchema } from '../../../src/shared/contracts';
import { isApiError } from '../../../src/server/errors';
import { generateUpdate } from '../../../src/server/generateUpdate';
import { checkGuardrails } from '../../../src/server/guardrails';

export async function POST(req: Request) {
  // Extract client IP for rate limiting
  const ip =
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    req.headers.get('x-real-ip') ??
    'unknown';

  // Check guardrails before any processing
  const guardrailResult = checkGuardrails(ip);
  if (!guardrailResult.ok) {
    return Response.json(
      { error: guardrailResult.message, code: guardrailResult.code },
      { status: guardrailResult.status, headers: guardrailResult.headers }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    const message = first
      ? `${first.path.length ? first.path.join('.') : 'request'}: ${first.message}`
      : 'invalid request';

    return Response.json(
      {
        error: message,
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
      },
      { status: 400 }
    );
  }

  const meaningfulChars = parsed.data.rawInput.match(/[A-Za-z0-9]/g)?.length ?? 0;
  if (meaningfulChars < 8) {
    return Response.json({ error: 'rawInput is too empty' }, { status: 400 });
  }

  try {
    const result = await generateUpdate(parsed.data);
    return Response.json(result, { status: 200 });
  } catch (err) {
    if (isApiError(err)) {
      return Response.json({ error: err.message, code: err.code }, { status: err.status });
    }
    return Response.json({ error: 'generation failed' }, { status: 500 });
  }
}
