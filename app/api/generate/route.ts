import { GenerateRequestSchema } from '../../../src/shared/contracts';
import { generateUpdate } from '../../../src/server/generateUpdate';

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'invalid json' }, { status: 400 });
  }

  const parsed = GenerateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: 'invalid request',
        issues: parsed.error.issues.map((i) => ({ path: i.path, message: i.message }))
      },
      { status: 400 }
    );
  }

  try {
    const result = await generateUpdate(parsed.data);
    return Response.json(result, { status: 200 });
  } catch {
    return Response.json({ error: 'generation failed' }, { status: 500 });
  }
}
