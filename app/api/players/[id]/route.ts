import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { playerSchema } from '@/lib/validation';
import { getPlayer, updatePlayer, deletePlayer } from '@/lib/services/playerService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const player = await getPlayer(params.id);
    if (!player) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(player);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
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
    const player = await updatePlayer(params.id, parsed.data);
    return NextResponse.json(player);
  } catch (error) {
    return apiErrorResponse(error, 'Player not found');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deletePlayer(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Player not found');
  }
}
