'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

/* ---------- Types ---------- */

type Msg = { role: 'user' | 'assistant'; content: string; t: number };
type Chat = { id: string; title: string; messages: Msg[]; created: number; updated: number };
type ApiResponse = { ok?: boolean; text?: string; error?: string };

const MODES = ['Auto', 'Spark', 'Lens', 'Coach', 'Connector'] as const;
type Mode = typeof MODES[number];

const TEMPLATES = [
  { label: 'Visa pitch + numbers', prompt: 'Draft a Visa partnership proposal with a short metrics box (traffic uplift assumptions) for kitround.' },
  { label: 'Board KPI update', prompt: 'Summarise last email’s impact on site traffic for the board. Keep it to one slide with a table.' },
  { label: 'Grassroots rugby idea', prompt: 'Design a grassroots rugby campaign to increase kitflow and community engagement.' }
];

const FORMAT_PREF =
  'Please format in **Markdown** using ### section headings, bullet lists (•), and tables where useful. No code fences. British English.';

/** Minimal browser speech-recognition type so TS is happy */
type BrowserSpeechRecognition = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  onresult: (ev: any) => void;
  onerror: (ev: any) => void;
  onend: () => void;
};

/* ---------- Utils ---------- */

function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- Component ---------- */

export default function Home() {
  const [mode, setMode] = useState<Mode>('Auto');
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeId, setActiveId] = useState<string>('');
  const recRef = useRef<BrowserSpeechRecognition | null>(null);
  const [listening, setListening] = useState(false);

  // Load chats from localStorage
  useEffect(() => {
    const raw = localStorage.getItem('kr_chats');
    const parsed: Chat[] = raw ? JSON.parse(raw) : [];
    if (parsed.length === 0) {
      const first: Chat = { id: uid(), title: 'New chat', messages: [], created: Date.now(), updated: Date.now() };
      setChats([first]);
      setActiveId(first.id);
      return;
    }
    setChats(parsed);
    setActiveId(parsed[0].id);
  }, []);

  // Persist chats
  useEffect(() => {
    if (chats.length) localStorage.setItem('kr_chats', JSON.stringify(chats));
  }, [chats]);

  const active = useMemo(() => chats.find(c => c.id === activeId) ?? null, [chats, activeId]);

  function newChat() {
    const c: Chat = { id: uid(), title: 'New chat', messages: [], created: Date.now(), updated: Date.now() };
    setChats([c, ...chats]);
    setActiveId(c.id);
    setDraft('');
    setErr('');
  }

  function renameChat(id: string, title: string) {
    setChats(cs => cs.map(c => (c.id === id ? { ...c, title } : c)));
  }

  function deleteChat(id: string) {
    const idx = chats.findIndex(c => c.id === id);
    const next = chats.filter(c => c.id !== id);
    setChats(next);
    if (!next.length) newChat();
    else setActiveId(next[Math.min(idx, next.length - 1)].id);
  }

  async function send(message: string) {
    if (!active) return;
    const trimmed = message.trim();
    if (!trimmed) return;

    // optimistic add of user message
    const userMsg: Msg = { role: 'user', content: trimmed, t: Date.now() };
    setChats(cs => cs.map(c => (c.id === active.id ? { ...c, messages: [...c.messages, userMsg], updated: Date.now() } : c)));
    setDraft('');
    setErr('');
    setLoading(true);

    // Give the Director short conversation context (last 8 messages)
    const last = (active.messages ?? []).slice(-8);
    const historyBlock = last.map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n\n');
    const combined = `${FORMAT_PREF}\n\nConversation so far:\n${historyBlock}\n\nUser: ${trimmed}`;

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: combined,
          mode: mode === 'Auto' ? undefined : mode.toUpperCase()
        })
      });
      const data = (await res.json()) as ApiResponse;
      if (!res.ok || !data.ok) throw new Error(data.error || 'Request failed');

      const aiMsg: Msg = { role: 'assistant', content: data.text || '', t: Date.now() };
      setChats(cs =>
        cs.map(c =>
          c.id === active.id
            ? {
                ...c,
                title: c.title === 'New chat' ? trimmed.slice(0, 40) : c.title,
                messages: [...c.messages, aiMsg],
                updated: Date.now()
              }
            : c
        )
      );
    } catch (e: unknown) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  // Basic browser mic (Chrome/Edge). For Safari or better accuracy we can add a Whisper route later.
  function toggleMic() {
    const SR: any = (window as any).webkitSpeechRecognition || (window as any).SpeechRecognition;
    if (!SR) {
      setErr('Your browser does not support built-in speech recognition.');
      return;
    }
    if (listening && recRef.current) {
      recRef.current.stop();
      return;
    }
    const rec = new (SR as any)() as BrowserSpeechRecognition;
    rec.lang = 'en-GB';
    rec.interimResults = false;
    rec.maxAlternatives = 1;

    rec.onresult = (ev: any) => {
      const text = ev?.results?.[0]?.[0]?.transcript || '';
      setDraft(prev => (prev ? `${prev.trim()} ${text}` : text));
    };
    rec.onerror = () => setErr('Microphone error.');
    rec.onend = () => setListening(false);

    rec.start();
    recRef.current = rec;
    setListening(true);
  }

  return (
    <main>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16 }}>
        {/* Sidebar */}
        <aside style={{ borderRight: '1px solid var(--border)', paddingRight: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
            <Image src="/kitround-logo.png" alt="kitround" width={120} height={32} />
          </div>

          <button className="btn secondary" onClick={newChat} style={{ width: '100%', marginBottom: 10 }}>
            + New chat
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, maxHeight: '72vh', overflow: 'auto' }}>
            {chats.map(c => (
              <div
                key={c.id}
                style={{
                  padding: '10px 12px',
                  border: '1px solid var(--border)',
                  borderRadius: 12,
                  background: c.id === activeId ? '#f8f8f8' : '#fff',
                  cursor: 'pointer'
                }}
                onClick={() => setActiveId(c.id)}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  <input
                    value={c.title}
                    onChange={e => renameChat(c.id, e.target.value)}
                    style={{ border: 'none', background: 'transparent', width: '100%', fontWeight: 600 }}
                  />
                  <button
                    onClick={ev => {
                      ev.stopPropagation();
                      deleteChat(c.id);
                    }}
                    className="btn secondary"
                    style={{ padding: '2px 8px' }}
                  >
                    ×
                  </button>
                </div>
              </div>
            ))}
          </div>
        </aside>

        {/* Main column */}
        <section>
          <header className="header" style={{ marginBottom: 6 }}>
            <h1 className="title" style={{ margin: 0 }}>
              kitround Director
            </h1>
            <p className="subtitle">
              Orchestrator <span className="brand">(The Director → Spark / Lens / Coach / Connector)</span>
            </p>
          </header>

          {/* Mode chips */}
          <div className="chips">
            {MODES.map(m => (
              <button key={m} onClick={() => setMode(m)} className={`chip ${m === mode ? 'active' : ''}`} aria-pressed={m === mode}>
                {m}
              </button>
            ))}
          </div>

          {/* Templates */}
          <div className="templates">
            {TEMPLATES.map(t => (
              <button key={t.label} onClick={() => setDraft(t.prompt)} className="template" title={t.prompt}>
                {t.label}
              </button>
            ))}
          </div>

          {/* Messages */}
          {active?.messages?.length ? (
            <div className="out" style={{ marginBottom: 12 }}>
              {active.messages.map((m, i) => (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>{m.role === 'user' ? 'You' : 'Director'}</div>
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>{m.content}</ReactMarkdown>
                </div>
              ))}
            </div>
          ) : null}

          {/* Input */}
          <textarea
            className="textarea"
            placeholder="Tell The Director what you need…"
            value={draft}
            onChange={e => setDraft(e.target.value)}
          />

          {/* Actions */}
          <div className="actions">
            <button
              onClick={() => send(draft)}
              disabled={loading || !draft.trim()}
              className="btn primary"
              style={{ opacity: loading || !draft.trim() ? 0.6 : 1 }}
            >
              {loading ? 'Thinking…' : 'Run'}
            </button>
            <button onClick={() => setDraft('')} className="btn secondary">
              Clear
            </button>
            <button onClick={toggleMic} className="btn secondary">
              {listening ? 'Stop mic' : '🎤 Mic'}
            </button>
          </div>

          {err && <div style={{ color: '#b00020', marginBottom: 12 }}>{err}</div>}
        </section>
      </div>
    </main>
  );
}
