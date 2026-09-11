import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { matchSchema } from '@/lib/validation';
import { getMatch, updateMatch, deleteMatch } from '@/lib/services/matchService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const match = await getMatch(params.id);
    if (!match) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(match);
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

  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const match = await updateMatch(params.id, parsed.data);
    return NextResponse.json(match);
  } catch (error) {
    return apiErrorResponse(error, 'Match not found');
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: { id: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteMatch(params.id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Match not found');
  }
}
