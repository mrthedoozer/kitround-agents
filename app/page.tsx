'use client';
import { useState } from 'react';

type ApiResponse = { ok?: boolean; text?: string; error?: string };

const TEMPLATES = [
  { label: 'Visa pitch + numbers', prompt: 'Draft a Visa partnership proposal with a short metrics box (traffic uplift assumptions) for kitround.' },
  { label: 'Board KPI update', prompt: 'Summarise last email’s impact on site traffic for the board. Keep it to one slide with a table.' },
  { label: 'Grassroots rugby idea', prompt: 'Design a grassroots rugby campaign to increase kitflow and community engagement.' }
];

const MODES = ['Auto', 'Spark', 'Lens', 'Coach', 'Connector'] as const;
type Mode = typeof MODES[number];

export default function Home() {
  const [mode, setMode] = useState<Mode>('Auto');
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [out, setOut] = useState<string>('');
  const [err, setErr] = useState<string>('');

  async function send(message: string) {
    setLoading(true); setErr('');
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          mode: mode === 'Auto' ? undefined : mode.toUpperCase()
        })
      });
      const data: ApiResponse = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');
      setOut(data.text || '');
    } catch (e: any) {
      setErr(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{minHeight:'100vh', background:'#fff', color:'#111'}}>
      <div style={{maxWidth: '760px', margin: '0 auto', padding: '40px 16px'}}>
        <header style={{marginBottom: 16}}>
          <h1 style={{fontSize: 24, fontWeight: 600}}>kitround Director</h1>
          <p style={{fontSize: 14, color:'#555'}}>Orchestrator (The Director → Spark / Lens / Coach / Connector)</p>
        </header>

        {/* Mode chips */}
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:16}}>
          {MODES.map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border:'1px solid #ddd', borderRadius:9999, padding:'6px 10px',
                background: m === mode ? '#111' : '#fff', color: m === mode ? '#fff' : '#111',
                cursor:'pointer'
              }}
            >
              {m}
            </button>
          ))}
        </div>

        {/* Templates */}
        <div style={{display:'flex', gap:8, flexWrap:'wrap', marginBottom:24}}>
          {TEMPLATES.map(t => (
            <button
              key={t.label}
              onClick={() => setInput(t.prompt)}
              title={t.prompt}
              style={{border:'1px solid #ddd', borderRadius:8, padding:'8px 10px', cursor:'pointer', background:'#fff'}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div style={{marginBottom:12}}>
          <textarea
            placeholder="Tell The Director what you need…"
            value={input}
            onChange={e => setInput(e.target.value)}
            style={{width:'100%', minHeight:120, border:'1px solid #ddd', borderRadius:8, padding:12}}
          />
        </div>
        <div style={{display:'flex', gap:8, marginBottom:24}}>
          <button
            onClick={() => send(input)}
            disabled={loading || !input.trim()}
            style={{background:'#111', color:'#fff', padding:'10px 14px', borderRadius:8, border:'none', cursor:'pointer', opacity: (loading || !input.trim()) ? 0.6 : 1}}
          >
            {loading ? 'Thinking…' : 'Run'}
          </button>
          <button onClick={() => setInput('')} style={{border:'1px solid #ddd', borderRadius:8, padding:'8px 12px', cursor:'pointer', background:'#fff'}}>
            Clear
          </button>
        </div>

        {/* Output */}
        {err && <div style={{color:'#b00020', marginBottom:12}}>{err}</div>}
        {out && (
          <article>
            <pre style={{whiteSpace:'pre-wrap', lineHeight:1.5}}>{out}</pre>
            <div style={{marginTop:12}}>
              <button
                onClick={() => navigator.clipboard.writeText(out)}
                style={{border:'1px solid #ddd', borderRadius:8, padding:'8px 12px', cursor:'pointer', background:'#fff'}}
              >
                Copy
              </button>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}
