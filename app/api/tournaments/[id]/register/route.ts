import { NextRequest, NextResponse } from 'next/server';
import { tournamentRegistrationSchema } from '@/lib/validation';
import { getTournament, registerForTournament } from '@/lib/services/tournamentService';
import { getPlayer } from '@/lib/services/playerService';
import { rateLimit } from '@/lib/rateLimit';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Public: anyone can hit this without logging in — that's necessary since
// the public site has no visitor accounts — but two checks below stand in
// for "is this really a club member": the roster-name check (same pattern
// as comments) and the tournament's own access code, which is only ever
// handed out to real members. This route never echoes the tournament's
// accessCode back in any response.
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
  const limit = rateLimit(`tournament-register:${ip}`, { limit: 8, windowSeconds: 600 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again later.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = tournamentRegistrationSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }
  const { playerId, accessCode } = parsed.data;

  try {
    const tournament = await getTournament(params.id);
    if (!tournament) {
      return NextResponse.json({ error: 'This tournament no longer exists.' }, { status: 404 });
    }
    if (tournament.status !== 'REGISTRATION_OPEN') {
      return NextResponse.json({ error: 'Registration for this tournament is not open.' }, { status: 400 });
    }
    if (tournament.registrationDeadline && new Date() > tournament.registrationDeadline) {
      return NextResponse.json({ error: 'The registration deadline has passed.' }, { status: 400 });
    }
    // Case-insensitive: this is a "do you know the club's code" check, not
    // a security-grade secret, so a mistyped capital letter shouldn't be
    // the reason someone can't register.
    if (accessCode.trim().toLowerCase() !== tournament.accessCode.trim().toLowerCase()) {
      return NextResponse.json({ error: 'That access code is not correct.' }, { status: 403 });
    }

    const player = await getPlayer(playerId);
    if (!player) {
      return NextResponse.json(
        { error: 'Please pick your name from the current roster list.' },
        { status: 400 }
      );
    }

    const registration = await registerForTournament(tournament.id, player.inGameId, player.name);
    return NextResponse.json(registration, { status: 201 });
  } catch (error) {
    // P2002 (unique tournamentId+inGameId) means this player already
    // registered — a friendlier message than apiErrorResponse's generic
    // "A record with these details already exists."
    const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code?: unknown }).code : undefined;
    if (code === 'P2002') {
      return NextResponse.json({ error: 'You are already registered for this tournament.' }, { status: 409 });
    }
    return apiErrorResponse(error);
  }
}
