'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudienceSchema,
  GenerateResponseSchema,
  LengthSchema,
  ToneSchema,
  type UpdateSettings
} from '../src/shared/contracts';
import { copyToClipboard, copyToClipboardAsSlack, downloadMarkdown } from '../src/client/export';
import { DEMO_INPUT } from '../src/shared/demoContent';

const AUDIENCE_OPTIONS = AudienceSchema.options;
const LENGTH_OPTIONS = LengthSchema.options;
const TONE_OPTIONS = ToneSchema.options;
const MAX_RAW_INPUT_CHARS = 20000;

export default function HomePage() {
  const [rawInput, setRawInput] = useState('');
  const [settings, setSettings] = useState<UpdateSettings>({
    audience: 'Cross-functional',
    length: 'Standard',
    tone: 'Crisp'
  });
  const [output, setOutput] = useState('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [error, setError] = useState<{ message: string; code?: string } | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedType, setCopiedType] = useState<'md' | 'slack' | null>(null);
  const afterRef = useRef<HTMLTextAreaElement | null>(null);

  // Track what was last generated (for detecting changes)
  const [lastGeneratedSettings, setLastGeneratedSettings] = useState<UpdateSettings | null>(null);
  const [lastGeneratedInput, setLastGeneratedInput] = useState<string | null>(null);

  // Track if user manually edited output since last generation
  const [outputDirty, setOutputDirty] = useState(false);

  const canExport = output.trim().length > 0;
  const canGenerate = rawInput.trim().length >= 10;
  const filename = useMemo(() => {
    const safeAudience = settings.audience.toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-');
    return `weekly-update-${safeAudience}.md`;
  }, [settings.audience]);

  // Derived: settings have changed since last generation
  const settingsChanged = useMemo(() => {
    if (!lastGeneratedSettings) return false;
    return (
      settings.audience !== lastGeneratedSettings.audience ||
      settings.length !== lastGeneratedSettings.length ||
      settings.tone !== lastGeneratedSettings.tone
    );
  }, [settings, lastGeneratedSettings]);

  // Derived: should show "regenerate to apply" hint
  const showRegenerateHint = output.length > 0 && settingsChanged;

  // Derived: error is retryable (server errors, timeouts, network, rate limits)
  const isRetryableError =
    error?.code &&
    ['provider_timeout', 'provider_error', 'request_failed', 'network_error', 'rate_limited'].includes(
      error.code
    );

  // Derived: error suggests trying the demo instead
  const showDemoSuggestion =
    error?.code && ['daily_limit_reached', 'generation_disabled'].includes(error.code);

  function onTryDemo() {
    setRawInput(DEMO_INPUT);
    setError(null);
  }

  useEffect(() => {
    if (!copiedType) return;
    const id = window.setTimeout(() => setCopiedType(null), 1200);
    return () => window.clearTimeout(id);
  }, [copiedType]);

  async function onCopy() {
    if (!canExport) return;
    setError(null);

    try {
      await copyToClipboard(output);
      setCopiedType('md');
    } catch {
      setError({ message: 'copy failed', code: 'copy_error' });
    }
  }

  async function onCopySlack() {
    if (!canExport) return;
    setError(null);

    try {
      await copyToClipboardAsSlack(output);
      setCopiedType('slack');
    } catch {
      setError({ message: 'copy failed', code: 'copy_error' });
    }
  }

  function onDownload() {
    if (!canExport) return;
    downloadMarkdown(filename, output);
  }

  async function onGenerate() {
    // Confirmation before overwriting user edits
    if (outputDirty && output.trim().length > 0) {
      const confirmed = window.confirm(
        'You have unsaved edits. Regenerating will replace them. Continue?'
      );
      if (!confirmed) return;
    }

    setIsGenerating(true);
    setError(null);
    setWarnings([]);
    setCopiedType(null);

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ rawInput, settings })
      });

      const json = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        const message =
          json && typeof json === 'object' && 'error' in json && typeof (json as any).error === 'string'
            ? (json as any).error
            : 'request failed';
        const code =
          json && typeof json === 'object' && 'code' in json && typeof (json as any).code === 'string'
            ? (json as any).code
            : 'request_failed';
        setError({ message, code });
        return;
      }

      const parsed = GenerateResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError({ message: 'invalid server response', code: 'parse_error' });
        return;
      }

      // Success - update all state
      setOutput(parsed.data.markdown);
      setWarnings(parsed.data.warnings ?? []);
      setLastGeneratedSettings({ ...settings });
      setLastGeneratedInput(rawInput);
      setOutputDirty(false);

      requestAnimationFrame(() => afterRef.current?.focus());
    } catch {
      setError({ message: 'request failed', code: 'network_error' });
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <div className="titleRow">
          <h1 className="title">Stakeholder Update Generator</h1>
          <div className="subtitle">Raw notes to polished updates</div>
        </div>

        <div className="controls" aria-label="generation controls">
          <div className="control">
            <label htmlFor="audience">Audience</label>
            <select
              id="audience"
              value={settings.audience}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  audience: e.target.value as UpdateSettings['audience']
                }))
              }
            >
              {AUDIENCE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label htmlFor="length">Length</label>
            <select
              id="length"
              value={settings.length}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  length: e.target.value as UpdateSettings['length']
                }))
              }
            >
              {LENGTH_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <div className="control">
            <label htmlFor="tone">Tone</label>
            <select
              id="tone"
              value={settings.tone}
              onChange={(e) =>
                setSettings((s) => ({
                  ...s,
                  tone: e.target.value as UpdateSettings['tone']
                }))
              }
            >
              {TONE_OPTIONS.map((v) => (
                <option key={v} value={v}>
                  {v}
                </option>
              ))}
            </select>
          </div>

          <button
            className={`primaryBtn ${showRegenerateHint ? 'primaryBtnHighlight' : ''}`}
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
          >
            {isGenerating ? 'Generating...' : showRegenerateHint ? 'Regenerate' : 'Generate'}
          </button>
        </div>

        <div className="hint">
          Nothing is saved. Avoid pasting secrets.{' '}
          <button className="linkBtn" onClick={onTryDemo}>
            Try demo
          </button>
        </div>
        {warnings.length > 0 && (
          <div className="hint">{warnings.join(' · ')}</div>
        )}
        {showRegenerateHint && (
          <div className="hint regenerateHint">
            Settings changed — regenerate to apply
          </div>
        )}
        {error && (
          <div className="errorContainer">
            <span className="errorMessage">{error.message}</span>
            {isRetryableError && (
              <button
                className="retryBtn"
                onClick={onGenerate}
                disabled={isGenerating}
              >
                Retry
              </button>
            )}
            {showDemoSuggestion && (
              <button className="retryBtn" onClick={onTryDemo}>
                Try demo
              </button>
            )}
          </div>
        )}
      </header>

      <section className="workspace" aria-label="before and after">
        <div className="panel">
          <div className="panelHeader">
            <p className="panelTitle">Before</p>
          </div>
          <textarea
            className="textarea"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            maxLength={MAX_RAW_INPUT_CHARS}
            placeholder="Paste your raw notes here...

• What shipped this week?
• What's in progress?
• Any blockers or risks?
• Key metrics or links?"
          />
          <span className="charCount">{rawInput.length.toLocaleString()} / {MAX_RAW_INPUT_CHARS.toLocaleString()}</span>
        </div>

        <div className="transform" aria-hidden="true">
          <div className="transformLine" />
          <div className="transformBadge">→</div>
          <div className="transformLine" />
        </div>

        <div className={`panel ${isGenerating ? 'panelGenerating' : ''}`}>
          <div className="panelHeader">
            <p className="panelTitle">After</p>
            <div className="panelActions">
              <button
                className="secondaryBtn"
                onClick={onCopy}
                disabled={!canExport}
                aria-label="copy generated draft"
              >
                {copiedType === 'md' ? 'Copied!' : 'Copy'}
              </button>
              <button
                className="secondaryBtn"
                onClick={onCopySlack}
                disabled={!canExport}
                aria-label="copy generated draft formatted for Slack"
              >
                {copiedType === 'slack' ? 'Copied!' : 'Copy for Slack'}
              </button>
              <button
                className="secondaryBtn"
                onClick={onDownload}
                disabled={!canExport}
                aria-label="download generated draft as markdown"
              >
                Download .md
              </button>
            </div>
          </div>
          <textarea
            className={`textarea ${isGenerating ? 'textareaGenerating' : ''}`}
            ref={afterRef}
            value={output}
            onChange={(e) => {
              setOutput(e.target.value);
              setOutputDirty(true);
            }}
            placeholder={isGenerating ? 'Generating your update...' : 'Your polished update will appear here...'}
            disabled={isGenerating}
          />
          <span className="charCount">{output.length.toLocaleString()} chars</span>
        </div>
      </section>
    </main>
  );
}
