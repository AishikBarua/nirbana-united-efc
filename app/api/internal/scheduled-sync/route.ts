import { NextRequest, NextResponse } from 'next/server';
import { runTrackerSync } from '@/lib/trackerSync';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Called by netlify/functions/hourly-sync.mts once an hour — this is what
// replaces lib/autoSync.ts's in-process setInterval on Netlify, since a
// serverless function's process doesn't stay alive to run a timer (see
// instrumentation.ts, which skips starting that timer specifically when
// process.env.NETLIFY is set, so the two mechanisms never run in parallel
// and double-hit the tracker).
//
// This route is intentionally NOT admin-session-protected (the scheduled
// function has no browser session/cookie to send) and is NOT listed in
// middleware.ts's PROTECTED_API_PREFIXES — instead it checks a shared
// secret header, exactly the pattern /api/comments/[id] uses requireAdmin()
// for its own inline check. Never call this from client-side/browser code;
// it's a server-to-server endpoint only.
export async function POST(request: NextRequest) {
  const provided = request.headers.get('x-sync-secret');
  const expected = process.env.SYNC_SECRET;

  if (!expected) {
    // Misconfiguration, not a real attempt — fail closed either way.
    console.error('[scheduled-sync] SYNC_SECRET is not set — refusing all requests.');
    return NextResponse.json({ error: 'Not configured' }, { status: 503 });
  }
  if (provided !== expected) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runTrackerSync();
    return NextResponse.json(result);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
