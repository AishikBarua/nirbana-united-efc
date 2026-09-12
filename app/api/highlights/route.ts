import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { playerHighlightSchema } from '@/lib/validation';
import { listAllHighlights, listHighlightsForPlayer, createHighlight } from '@/lib/services/highlightService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const inGameId = request.nextUrl.searchParams.get('inGameId');
    const highlights = inGameId ? await listHighlightsForPlayer(inGameId) : await listAllHighlights();
    return NextResponse.json(highlights);
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

  const parsed = playerHighlightSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  try {
    const highlight = await createHighlight(parsed.data);
    return NextResponse.json(highlight, { status: 201 });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
