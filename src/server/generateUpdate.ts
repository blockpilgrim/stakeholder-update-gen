import type { GenerateRequest, GenerateResponse, Length } from '../shared/contracts';
import { ApiError, isApiError } from './errors';
import { generateText } from './llm';

const MAX_OUTPUT_CHARS = 30_000;

function maxTokensForLength(length: Length): number {
  switch (length) {
    case 'Short':
      return 450;
    case 'Standard':
      return 900;
    case 'Detailed':
      return 1400;
  }
}

function normalizeMarkdown(md: string): string {
  return md.replaceAll('\r\n', '\n').trim();
}

function enforceOutputCaps(md: string): { markdown: string; warnings: string[] } {
  const warnings: string[] = [];
  const normalized = normalizeMarkdown(md);

  if (!normalized) {
    throw new ApiError({
      status: 502,
      code: 'empty_output',
      message: 'generation failed'
    });
  }

  if (normalized.length <= MAX_OUTPUT_CHARS) {
    return { markdown: normalized, warnings };
  }

  warnings.push(`output truncated to ${MAX_OUTPUT_CHARS} characters`);
  return { markdown: normalized.slice(0, MAX_OUTPUT_CHARS).trimEnd(), warnings };
}

function stubMarkdown({ rawInput, settings }: GenerateRequest): string {
  const trimmed = rawInput.trim();
  const excerpt = trimmed.length > 700 ? `${trimmed.slice(0, 700)}\n…` : trimmed;

  const header = `# Weekly update (${settings.audience} · ${settings.length} · ${settings.tone})`;

  if (settings.audience === 'Exec') {
    return [
      header,
      '',
      '## TL;DR',
      '- [stub] outcome + timeline summary',
      '',
      '## What changed',
      '- [stub] top changes (2–4 bullets)',
      '',
      '## Risks',
      '- [stub] risks / blockers (omit if none)',
      '',
      '## Asks',
      '- [stub] decisions needed / asks (omit if none)',
      '',
      '---',
      '### Notes excerpt',
      excerpt
    ].join('\n');
  }

  if (settings.audience === 'Engineering') {
    return [
      header,
      '',
      '## Summary',
      '- [stub] 2–4 bullets summarizing the week',
      '',
      '## Shipped / Done',
      '- [stub]',
      '',
      '## In progress',
      '- [stub]',
      '',
      '## Blocked / Needs input',
      '- [stub] flag unknowns as (unknown) or [TBD]',
      '',
      '## Next up',
      '- [stub]',
      '',
      '## Links',
      '- [stub]',
      '',
      '---',
      '### Notes excerpt',
      excerpt
    ].join('\n');
  }

  return [
    header,
    '',
    '## TL;DR',
    '- [stub] 1–3 bullets',
    '',
    '## Progress / Wins',
    '- [stub]',
    '',
    '## Metrics (conditional)',
    '- [stub] include only if notes contain metrics',
    '',
    '## Risks / Blockers',
    '- [stub]',
    '',
    '## Asks / Decisions needed',
    '- [stub]',
    '',
    '## Next up',
    '- [stub]',
    '',
    '## Links',
    '- [stub]',
    '',
    '---',
    '### Notes excerpt',
    excerpt
  ].join('\n');
}

function buildSystemPrompt(): string {
  return [
    'You are an expert product/engineering communicator. Convert raw notes into a stakeholder-ready WEEKLY update.',
    '',
    'Rules:',
    '- Output MUST be valid Markdown.',
    '- Never invent specifics. If a critical detail is missing, flag it as (unknown) or [TBD].',
    '- Omit empty sections rather than stating “none”, unless the notes explicitly say so.',
    '- Prefer scannable bullets and concrete nouns/numbers when available.',
    '- If there are important gaps that block clarity, add an optional “Open questions” section.',
    '- If the input suggests metrics, include a Metrics section; otherwise omit it.'
  ].join('\n');
}

function buildUserPrompt(req: GenerateRequest): string {
  return [
    `Audience: ${req.settings.audience}`,
    `Length: ${req.settings.length}`,
    `Tone: ${req.settings.tone}`,
    '',
    'Raw notes:',
    req.rawInput
  ].join('\n');
}

export async function generateUpdate(req: GenerateRequest): Promise<GenerateResponse> {
  const maxTokens = maxTokensForLength(req.settings.length);
  const system = buildSystemPrompt();
  const user = buildUserPrompt(req);

  try {
    const result = await generateText({
      system,
      user,
      maxTokens,
      temperature: 0.2,
      timeoutMs: 25_000
    });

    const capped = enforceOutputCaps(result.text);
    return {
      markdown: capped.markdown,
      warnings: capped.warnings.length ? capped.warnings : undefined,
      meta: result.meta
    };
  } catch (err) {
    if (isApiError(err) && err.code === 'provider_misconfigured') {
      const capped = enforceOutputCaps(stubMarkdown(req));
      const warnings = [
        'stub mode: set ANTHROPIC_API_KEY to enable live generation',
        ...capped.warnings
      ];

      return {
        markdown: capped.markdown,
        warnings: warnings.length ? warnings : undefined,
        meta: { provider: 'stub', durationMs: 0 }
      };
    }

    throw err;
  }
}
