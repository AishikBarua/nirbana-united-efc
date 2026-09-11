import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { matchSchema } from '@/lib/validation';
import { listMatches, createMatch } from '@/lib/services/matchService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET() {
  try {
    const matches = await listMatches();
    return NextResponse.json(matches);
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

  const parsed = matchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const match = await createMatch(parsed.data);
    return NextResponse.json(match, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
