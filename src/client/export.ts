export async function copyToClipboard(text: string): Promise<void> {
  await navigator.clipboard.writeText(text);
}

/**
 * Convert standard markdown to Slack's mrkdwn format.
 * Handles headings, bold, links, and bullets.
 */
export function markdownToSlackMrkdwn(markdown: string): string {
  let result = markdown;

  // 1. Convert headings (## H2, # H1) to bold lines
  result = result.replace(/^#{1,6} (.+)$/gm, '*$1*');

  // 2. Convert bold: **text** -> *text*
  result = result.replace(/\*\*(.+?)\*\*/g, '*$1*');

  // 3. Convert links: [text](url) -> <url|text>
  result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<$2|$1>');

  // 4. Convert bullet points: - item -> • item
  result = result.replace(/^- /gm, '• ');

  return result;
}

export async function copyToClipboardAsSlack(markdown: string): Promise<void> {
  const slackFormatted = markdownToSlackMrkdwn(markdown);
  await navigator.clipboard.writeText(slackFormatted);
}

export function downloadMarkdown(filename: string, markdown: string): void {
  const blob = new Blob([markdown], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
