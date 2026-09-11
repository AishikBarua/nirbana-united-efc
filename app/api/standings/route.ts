import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { standingSchema } from '@/lib/validation';
import { listStandings, createStanding } from '@/lib/services/standingService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET() {
  try {
    const rows = await listStandings();
    return NextResponse.json(rows);
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

  const parsed = standingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const row = await createStanding(parsed.data);
    return NextResponse.json(row, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
