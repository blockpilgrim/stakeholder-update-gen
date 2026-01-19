'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AudienceSchema,
  GenerateResponseSchema,
  LengthSchema,
  ToneSchema,
  type UpdateSettings
} from '../src/shared/contracts';
import { copyToClipboard, downloadMarkdown } from '../src/client/export';

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
  const [copied, setCopied] = useState(false);
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

  // Derived: error is retryable (server errors, timeouts, network)
  const isRetryableError =
    error?.code &&
    ['provider_timeout', 'provider_error', 'request_failed', 'network_error'].includes(error.code);

  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(id);
  }, [copied]);

  async function onCopy() {
    if (!canExport) return;
    setError(null);

    try {
      await copyToClipboard(output);
      setCopied(true);
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
    setCopied(false);

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
          <h1 className="title">stakeholder update generator</h1>
          <div className="subtitle">weekly · paste notes → sendable update</div>
        </div>

        <div className="controls" aria-label="generation controls">
          <div className="control">
            <label htmlFor="audience">audience</label>
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
            <label htmlFor="length">length</label>
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
            <label htmlFor="tone">tone</label>
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
            {isGenerating ? 'generating…' : showRegenerateHint ? 'regenerate' : 'generate'}
          </button>
        </div>

        <div className="hint">privacy: nothing is saved by default. do not paste secrets.</div>
        {warnings.length > 0 && (
          <div className="hint">{warnings.join(' · ')}</div>
        )}
        {showRegenerateHint && (
          <div className="hint regenerateHint">
            settings changed - click regenerate to apply
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
                retry
              </button>
            )}
          </div>
        )}
      </header>

      <section className="workspace" aria-label="before and after">
        <div className="panel">
          <div className="panelHeader">
            <p className="panelTitle">before (raw notes)</p>
            <span className="hint">{rawInput.length}/{MAX_RAW_INPUT_CHARS}</span>
          </div>
          <textarea
            className="textarea"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            maxLength={MAX_RAW_INPUT_CHARS}
            placeholder={
              'paste raw notes here…\n\n- shipped: …\n- in progress: …\n- blockers: …\n- links: …'
            }
          />
        </div>

        <div className="transform" aria-hidden="true">
          <div className="transformLine" />
          <div className="transformBadge">→</div>
          <div className="transformLine" />
        </div>

        <div className={`panel ${isGenerating ? 'panelGenerating' : ''}`}>
          <div className="panelHeader">
            <div className="panelHeaderLeft">
              <p className="panelTitle">after (editable markdown)</p>
              <span className="hint">{output.length} chars</span>
            </div>

            <div className="panelActions">
              <button
                className="secondaryBtn"
                onClick={onCopy}
                disabled={!canExport}
                aria-label="copy generated draft"
              >
                {copied ? 'copied' : 'copy'}
              </button>
              <button
                className="secondaryBtn"
                onClick={onDownload}
                disabled={!canExport}
                aria-label="download generated draft as markdown"
              >
                download .md
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
            placeholder={isGenerating ? 'generating…' : 'generated output will appear here…'}
            disabled={isGenerating}
          />
        </div>
      </section>
    </main>
  );
}
