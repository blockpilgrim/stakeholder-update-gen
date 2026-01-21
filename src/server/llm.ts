import { ApiError } from './errors';
import { anthropicGenerateText } from './anthropic';

export type GenerateTextInput = {
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
};

export type GenerateTextResult = {
  text: string;
  meta: {
    provider: string;
    model?: string;
    durationMs: number;
    tokenUsage?: {
      inputTokens: number;
      outputTokens: number;
    };
  };
};

function isAbortError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false;
  return 'name' in err && (err as any).name === 'AbortError';
}

export async function generateText(input: GenerateTextInput): Promise<GenerateTextResult> {
  const provider = (process.env.LLM_PROVIDER ?? 'anthropic').toLowerCase();
  const startedAt = Date.now();

  if (provider !== 'anthropic') {
    throw new ApiError({
      status: 500,
      code: 'provider_not_supported',
      message: `unsupported llm provider: ${provider}`
    });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  const model = process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-4-5-20250929';

  if (!apiKey) {
    throw new ApiError({
      status: 503,
      code: 'provider_misconfigured',
      message: 'generation provider is not configured'
    });
  }

  try {
    const result = await anthropicGenerateText({
      apiKey,
      model,
      system: input.system,
      user: input.user,
      maxTokens: input.maxTokens,
      temperature: input.temperature,
      timeoutMs: input.timeoutMs
    });

    return {
      text: result.text,
      meta: {
        provider: 'anthropic',
        model,
        durationMs: Date.now() - startedAt,
        tokenUsage: result.tokenUsage
      }
    };
  } catch (err) {
    if (isAbortError(err)) {
      throw new ApiError({
        status: 504,
        code: 'provider_timeout',
        message: 'generation timed out — please try again',
        cause: err
      });
    }

    // Log the actual error for debugging
    console.error('[llm] provider error:', err instanceof Error ? err.message : err);

    throw new ApiError({
      status: 502,
      code: 'provider_error',
      message: 'generation provider error — please try again',
      cause: err
    });
  }
}
