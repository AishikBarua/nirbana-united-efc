import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { clubInfoSchema } from '@/lib/validation';
import { getClubInfo, saveClubInfo } from '@/lib/services/clubService';
import { apiErrorResponse } from '@/lib/apiErrors';

export async function GET() {
  try {
    const info = await getClubInfo();
    return NextResponse.json(info);
  } catch (error) {
    return apiErrorResponse(error);
  }
}

export async function PUT(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = clubInfoSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const info = await saveClubInfo(parsed.data);
    return NextResponse.json(info);
  } catch (error) {
    return apiErrorResponse(error);
  }
}
