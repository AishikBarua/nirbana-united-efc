import { NextResponse } from 'next/server';

// This was a temporary diagnostic route used once to track down a tracker-
// fetch bug (see lib/trackerSync.ts's parseFixtureTotalCount comment) — it's
// no longer needed and does nothing now. Safe to delete this whole
// app/api/admin/debug-fetch folder next time you're in the project folder;
// left in place only because this session has no way to delete files on
// your PC directly.
export async function GET() {
  return NextResponse.json({ ok: true, note: 'Diagnostic route, no longer in use.' }, { status: 410 });
}
