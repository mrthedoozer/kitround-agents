// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { run } from '@openai/agents';
import { director } from '../../../lib/agents';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const { message, mode } = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Missing "message"' }, { status: 400 });
    }

    // Allow forcing a specific specialist by "mode"
    const input =
      mode && ['SPARK','LENS','COACH','CONNECTOR'].includes(String(mode).toUpperCase())
        ? `[${String(mode).toUpperCase()}] ${message}`
        : message;

    // Run the Director (it will hand off to specialists as needed)
    const result = await run(director, input);

    const text =
      typeof result.finalOutput === 'string'
        ? result.finalOutput
        : (result as any)?.finalOutput?.text ?? '';

    // Some versions don't expose `usage`. Keep the response simple.
    return Response.json({ ok: true, text });
  } catch (err: any) {
    console.error(err);
    return Response.json({ error: err?.message ?? 'Server error' }, { status: 500 });
  }
}
