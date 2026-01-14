'use client';

import { useMemo, useState } from 'react';
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

  const canExport = output.trim().length > 0;
  const filename = useMemo(() => {
    const safeAudience = settings.audience.toLowerCase().replaceAll(/[^a-z0-9-]+/g, '-');
    return `weekly-update-${safeAudience}.md`;
  }, [settings.audience]);

  async function onGenerate() {
    setIsGenerating(true);
    setError(null);
    setWarnings([]);

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
    } catch {
      setError('request failed');
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <main className="container">
      <header className="header">
        <h1 className="title">stakeholder update generator</h1>
        <div className="controls">
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

          <button className="primaryBtn" onClick={onGenerate} disabled={isGenerating}>
            {isGenerating ? 'generating…' : 'generate'}
          </button>

          <button
            className="secondaryBtn"
            onClick={() => copyToClipboard(output)}
            disabled={!canExport}
          >
            copy
          </button>
          <button
            className="secondaryBtn"
            onClick={() => downloadMarkdown(filename, output)}
            disabled={!canExport}
          >
            download .md
          </button>
        </div>

        <div className="hint">privacy: nothing is saved by default. don’t paste secrets.</div>
        {warnings.length > 0 ? (
          <div className="hint">{warnings.join(' · ')}</div>
        ) : null}
        {error ? <div className="error">{error}</div> : null}
      </header>

      <section className="grid">
        <div className="panel">
          <div className="panelHeader">
            <p className="panelTitle">before (raw notes)</p>
            <span className="hint">{rawInput.length}/20000</span>
          </div>
          <textarea
            className="textarea"
            value={rawInput}
            onChange={(e) => setRawInput(e.target.value)}
            placeholder={
              'paste raw notes here…\n\n- shipped: …\n- in progress: …\n- blockers: …\n- links: …'
            }
          />
        </div>

        <div className="panel">
          <div className="panelHeader">
            <p className="panelTitle">after (editable markdown)</p>
            <span className="hint">{output.length} chars</span>
          </div>
          <textarea
            className="textarea"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder={'generated output will appear here…'}
          />
        </div>
      </section>
    </main>
  );
}
