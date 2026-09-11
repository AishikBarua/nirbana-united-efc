import { NextResponse } from 'next/server';
import { listNotifications } from '@/lib/services/notificationService';
import { apiErrorResponse } from '@/lib/apiErrors';

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
