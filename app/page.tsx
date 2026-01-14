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
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const afterRef = useRef<HTMLTextAreaElement | null>(null);

  const canExport = output.trim().length > 0;
  const canGenerate = rawInput.trim().length >= 10;
  const filename = useMemo(() => {
    const safeAudience = settings.audience.toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-');
    return `weekly-update-${safeAudience}.md`;
  }, [settings.audience]);

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
      setError('copy failed');
    }
  }

  function onDownload() {
    if (!canExport) return;
    downloadMarkdown(filename, output);
  }

  async function onGenerate() {
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
        setError(message);
        return;
      }

      const parsed = GenerateResponseSchema.safeParse(json);
      if (!parsed.success) {
        setError('invalid server response');
        return;
      }

      setOutput(parsed.data.markdown);
      setWarnings(parsed.data.warnings ?? []);

      requestAnimationFrame(() => afterRef.current?.focus());
    } catch {
      setError('request failed');
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
            className="primaryBtn"
            onClick={onGenerate}
            disabled={isGenerating || !canGenerate}
          >
            {isGenerating ? 'generating…' : 'generate'}
          </button>
        </div>

        <div className="hint">privacy: nothing is saved by default. don’t paste secrets.</div>
        {warnings.length > 0 ? (
          <div className="hint">{warnings.join(' · ')}</div>
        ) : null}
        {error ? <div className="error">{error}</div> : null}
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

        <div className="panel">
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
            className="textarea"
            ref={afterRef}
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder={'generated output will appear here…'}
          />
        </div>
      </section>
    </main>
  );
}
