// app/api/chat/route.ts
import { NextRequest } from 'next/server';
import { run } from '@openai/agents';
import { director } from '../../../lib/agents'; // <- 3 levels up from app/api/chat/route.ts

export const runtime = 'nodejs';

type Body = { message?: string; mode?: string };

export async function POST(req: NextRequest) {
  try {
    const { message, mode }: Body = await req.json();

    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Missing "message"' }, { status: 400 });
    }

    // Optional specialist override: prefix the message with [SPARK]/[LENS]/[COACH]/[CONNECTOR]
    const useMode = typeof mode === 'string' ? mode.toUpperCase() : undefined;
    const textInput =
      useMode && ['SPARK', 'LENS', 'COACH', 'CONNECTOR'].includes(useMode)
        ? `[${useMode}] ${message}`
        : message;

    // pass a string to run()
    const result = await run(director, textInput);

    // normalise result text
    const text =
      typeof (result as any).finalOutput === 'string'
        ? ((result as any).finalOutput as string)
        : ((result as any).finalOutput?.text as string) ?? '';

    return Response.json({ ok: true, text });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(err);
    return Response.json({ error: msg || 'Server error' }, { status: 500 });
  }
}
