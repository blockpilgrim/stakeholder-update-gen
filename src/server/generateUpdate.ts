import type { GenerateRequest, GenerateResponse } from '../shared/contracts';
import { anthropicGenerateText } from './anthropic';

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-sonnet-20241022';

  if (!apiKey) {
    return {
      markdown: stubMarkdown(req),
      warnings: ['stub mode: set ANTHROPIC_API_KEY to enable live generation']
    };
  }

  const markdown = await anthropicGenerateText({
    apiKey,
    model,
    system: buildSystemPrompt(),
    user: buildUserPrompt(req),
    maxTokens: 900,
    temperature: 0.2,
    timeoutMs: 25_000
  });

  return { markdown };
}
