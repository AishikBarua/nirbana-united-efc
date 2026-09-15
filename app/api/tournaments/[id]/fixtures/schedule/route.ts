import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { tournamentRoundScheduleSchema } from '@/lib/validation';
import { scheduleRound } from '@/lib/services/tournamentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data — never safe to let Next.js
// statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Admin-only: the "match day" scheduler. Sets one date/time across every
// fixture in one round of this tournament at once (see scheduleRound in
// tournamentService.ts) — not a per-fixture edit, which is what
// /api/tournaments/[id]/matches/[matchId] is for. Checked directly rather
// than via middleware.ts, same pattern as the rest of /api/tournaments/*.
export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = tournamentRoundScheduleSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const count = await scheduleRound(params.id, parsed.data);
    if (count === 0) {
      return NextResponse.json({ error: 'No fixtures exist in that round yet.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true, updated: count });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
