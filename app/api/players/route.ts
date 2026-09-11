import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { playerSchema } from '@/lib/validation';
import { listPlayers, createPlayer } from '@/lib/services/playerService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET() {
  try {
    const players = await listPlayers();
    return NextResponse.json(players);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = playerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const player = await createPlayer(parsed.data);
    return NextResponse.json(player, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
