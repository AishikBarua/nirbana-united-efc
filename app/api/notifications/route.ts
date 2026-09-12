import { NextResponse } from 'next/server';
import { listNotifications } from '@/lib/services/notificationService';
import { apiErrorResponse } from '@/lib/apiErrors';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Public GET, like every other read-only /api route (see middleware.ts's
// PROTECTED_API_PREFIXES) — notifications are visible to every visitor, not
// just admins, so there's no write method on this route at all.
export async function GET() {
  try {
    const notifications = await listNotifications(30);
    return NextResponse.json({ notifications });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
