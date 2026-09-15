import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { tournamentMatchSchema } from '@/lib/validation';
import { updateMatch, deleteMatch } from '@/lib/services/tournamentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data — never safe to let Next.js
// statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Admin-only: edits one fixture (players, round, scores, status). Checked
// directly rather than via middleware.ts, same pattern as the rest of
// /api/tournaments/*.
export async function PUT(request: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = tournamentMatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const match = await updateMatch(params.id, params.matchId, parsed.data);
    if (!match) return NextResponse.json({ error: 'Fixture not found' }, { status: 404 });
    return NextResponse.json(match);
  } catch (error) {
    if (error instanceof Error && error.message.includes('registered')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error, 'Fixture not found');
  }
}

// Admin-only: removes one fixture.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string; matchId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteMatch(params.matchId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Fixture not found');
  }
}
