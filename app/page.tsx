'use client';

import { useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

type ApiResponse = { ok?: boolean; text?: string; error?: string };

const TEMPLATES = [
  { label: 'Visa pitch + numbers', prompt: 'Draft a Visa partnership proposal with a short metrics box (traffic uplift assumptions) for kitround.' },
  { label: 'Board KPI update', prompt: 'Summarise last email’s impact on site traffic for the board. Keep it to one slide with a table.' },
  { label: 'Grassroots rugby idea', prompt: 'Design a grassroots rugby campaign to increase kitflow and community engagement.' }
];

const MODES = ['Auto', 'Spark', 'Lens', 'Coach', 'Connector'] as const;
type Mode = typeof MODES[number];

// Small prefix to nudge the agents to clean Markdown
const FORMAT_PREF =
  'Please format in **Markdown** with `###` section headings, bullet lists, and tables where useful. No code fences. British English.';

export default function Home() {
  const [mode, setMode] = useState<Mode>('Auto');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string>('');
  const [err, setErr] = useState<string>('');

  async function send(message: string) {
    if (!message.trim()) return;
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `${FORMAT_PREF}\n\n${message}`,
          mode: mode === 'Auto' ? undefined : mode.toUpperCase()
        })
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
      setOut(data.text || '');
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <div className="container">
        {/* Header */}
        <header className="header">
          <Image src="/kitround-logo.png" alt="kitround" width={150} height={40} className="logo" />
          <div>
            <h1 className="title">kitround Director</h1>
            <p className="subtitle">Orchestrator <span className="brand">(The Director → Spark / Lens / Coach / Connector)</span></p>
          </div>
        </header>

        {/* Mode chips */}
        <div className="chips">
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`chip ${m === mode ? 'active' : ''}`}
              aria-pressed={m === mode}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Templates */}
        <div className="templates">
          {TEMPLATES.map(t => (
            <button key={t.label} onClick={() => setInput(t.prompt)} className="template" title={t.prompt}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <textarea
          className="textarea"
          placeholder="Tell The Director what you need…"
          value={input}
          onChange={e => setInput(e.target.value)}
        />

        {/* Actions */}
        <div className="actions">
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            className="btn primary"
            style={{ opacity: (loading || !input.trim()) ? 0.6 : 1 }}
          >
            {loading ? 'Thinking…' : 'Run'}
          </button>
          <button onClick={() => setInput('')} className="btn secondary">Clear</button>
        </div>

        {/* Output */}
        {err && <div style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}

        {!!out && (
          <section className="out">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{out}</ReactMarkdown>
            <div className="copyRow">
              <button
                onClick={() => navigator.clipboard.writeText(out)}
                className="btn secondary"
                title="Copy the output (Markdown)"
              >
                Copy
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
