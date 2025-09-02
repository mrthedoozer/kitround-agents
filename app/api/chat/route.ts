// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { run } from '@openai/agents';
import { director } from '../../../lib/agents';

export const runtime = 'nodejs';

// Narrow result without using `any`
type FinalOutput = string | { text?: string };
type RunResultShape = { finalOutput?: FinalOutput };

function extractText(result: unknown): string {
  if (typeof result === 'object' && result !== null && 'finalOutput' in result) {
    const r = result as RunResultShape;
    if (typeof r.finalOutput === 'string') return r.finalOutput;
    if (
      r.finalOutput &&
      typeof r.finalOutput === 'object' &&
      'text' in r.finalOutput &&
      typeof (r.finalOutput as { text?: unknown }).text === 'string'
    ) {
      return (r.finalOutput as { text?: string }).text ?? '';
    }
  }
  return '';
}

export async function POST(req: NextRequest) {
  try {
    const body: unknown = await req.json();
    const message = (body as { message?: unknown })?.message;
    const mode = (body as { mode?: unknown })?.mode;

    if (typeof message !== 'string' || !message.trim()) {
      return Response.json({ error: 'Missing "message"' }, { status: 400 });
    }

    const validModes = ['SPARK', 'LENS', 'COACH', 'CONNECTOR'] as const;
    const input =
      typeof mode === 'string' && validModes.includes(mode.toUpperCase() as (typeof validModes)[number])
        ? `[${mode.toUpperCase()}] ${message}`
        : message;

    const result = await run(director, input);
    const text = extractText(result);

    return Response.json({ ok: true, text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(msg);
    return Response.json({ error: msg || 'Server error' }, { status: 500 });
  }
}
