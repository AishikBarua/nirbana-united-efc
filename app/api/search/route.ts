import { NextRequest, NextResponse } from 'next/server';
import { siteSearch } from '@/lib/services/searchService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Public GET, like every other read-only /api route — see middleware.ts's
// PROTECTED_API_PREFIXES (only write methods are gated, and this route has
// no write method at all).
export async function GET(req: NextRequest) {
  try {
    const q = req.nextUrl.searchParams.get('q') ?? '';
    const results = await siteSearch(q);
    return NextResponse.json({ results });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
