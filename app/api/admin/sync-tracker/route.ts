import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { runTrackerSync } from '@/lib/trackerSync';

// Powers the "Sync with Tracker" button on /admin/dashboard — the online
// equivalent of double-clicking sync-with-tracker.bat locally. Both call
// the exact same lib/trackerSync.ts engine, so the result is identical
// either way; see that file for what this does and what it preserves.
export async function POST() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await runTrackerSync();
    if (!result.ok) {
      return NextResponse.json({ ok: false, problems: result.problems }, { status: 422 });
    }
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json(
      { ok: false, problems: [e instanceof Error ? e.message : 'Sync failed with an unexpected error.'] },
      { status: 500 }
    );
  }
}
