type AnthropicTextBlock = {
  type: 'text';
  text: string;
};

type AnthropicMessageResponse = {
  content: AnthropicTextBlock[];
};

export async function anthropicGenerateText({
  apiKey,
  model,
  system,
  user,
  maxTokens,
  temperature,
  timeoutMs
}: {
  apiKey: string;
  model: string;
  system: string;
  user: string;
  maxTokens: number;
  temperature: number;
  timeoutMs: number;
}): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model,
        max_tokens: maxTokens,
        temperature,
        system,
        messages: [{ role: 'user', content: user }]
      }),
      signal: controller.signal
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`anthropic request failed (${res.status}): ${text.slice(0, 500)}`);
    }

    const data = (await res.json()) as AnthropicMessageResponse;
    const text = data.content
      .filter((b): b is AnthropicTextBlock => b?.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim();

    if (!text) throw new Error('anthropic response had no text content');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}
