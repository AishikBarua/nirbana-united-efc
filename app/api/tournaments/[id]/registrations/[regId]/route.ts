import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { deleteRegistration } from '@/lib/services/tournamentService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Admin-only: removes one registrant (a mistaken sign-up, a duplicate, or
// someone who shouldn't have been able to get the access code). Checked
// directly rather than via middleware.ts, same reasoning as the rest of
// /api/tournaments/*.
export async function DELETE(_request: NextRequest, { params }: { params: { id: string; regId: string } }) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await deleteRegistration(params.regId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error, 'Registration not found');
  }
}
