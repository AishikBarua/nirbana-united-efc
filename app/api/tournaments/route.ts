import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { tournamentSchema } from '@/lib/validation';
import { listPublicTournaments, createTournament } from '@/lib/services/tournamentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Public: the tournament list itself (name/status/dates) is not sensitive —
// only the access code is, which listPublicTournaments' select deliberately
// excludes (see its own comment in tournamentService.ts).
export async function GET() {
  try {
    const tournaments = await listPublicTournaments();
    return NextResponse.json(tournaments);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

// Admin-only for creating a tournament — checked directly here rather than
// via middleware.ts's PROTECTED_API_PREFIXES, because /api/tournaments
// itself must stay open (its GET is public, and a nested public POST lives
// at /api/tournaments/[id]/register). Same pattern as /api/comments.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = tournamentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const tournament = await createTournament(parsed.data);
    return NextResponse.json(tournament, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
