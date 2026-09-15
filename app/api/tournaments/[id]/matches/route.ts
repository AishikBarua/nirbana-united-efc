import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { tournamentMatchSchema } from '@/lib/validation';
import { createMatch } from '@/lib/services/tournamentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data — never safe to let Next.js
// statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Admin-only: creates one fixture (a head-to-head pairing between two of
// this tournament's registrants) — see the TournamentMatch model's own
// comment for why this is hand-entered rather than auto-generated. Checked
// directly rather than via middleware.ts's PROTECTED_API_PREFIXES, same
// pattern as the rest of /api/tournaments/*.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
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
    const match = await createMatch(params.id, parsed.data);
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('registered')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return apiErrorResponse(error);
  }
}
