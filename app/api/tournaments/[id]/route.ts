import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { tournamentSchema, tournamentStatusSchema } from '@/lib/validation';
import {
  getPublicTournament,
  updateTournament,
  updateTournamentStatus,
  deleteTournament,
} from '@/lib/services/tournamentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Public — see getPublicTournament's own select for why the access code
// never comes back here.
export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tournament = await getPublicTournament(params.id);
    if (!tournament) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(tournament);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Admin-only, checked directly (see app/api/tournaments/route.ts for why
// this whole path isn't in middleware.ts's PROTECTED_API_PREFIXES).
// Accepts either the editable fields (name/description/accessCode/dates)
// or a `status` transition — never both in one request, so the two are
// validated and applied separately.
export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const statusParsed = tournamentStatusSchema.safeParse(body);
  if (statusParsed.success) {
    try {
      const tournament = await updateTournamentStatus(params.id, statusParsed.data.status);
      if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
      return NextResponse.json(tournament);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : 'Could not change status' },
        { status: 409 }
      );
    }
  }

  const parsed = tournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const tournament = await updateTournament(params.id, parsed.data);
    if (!tournament) return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    return NextResponse.json(tournament);
  } catch (error) {
    return apiErrorResponse(error, 'Tournament not found');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteTournament(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Tournament not found');
  }
}
