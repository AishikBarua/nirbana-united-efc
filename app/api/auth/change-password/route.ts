import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { changePasswordSchema } from '@/lib/validation';
import { updateAdminPassword } from '@/lib/services/authService';
import { rateLimit } from '@/lib/rateLimit';
import { apiErrorResponse } from '@/lib/apiErrors';

// Lets a logged-in admin change their own password from /admin/settings,
// stored hashed in the database — the supported alternative to editing
// ADMIN_PASSWORD in .env (which only seeds the very first account). Not
// listed in middleware.ts's PROTECTED_API_PREFIXES, so the session check
// happens directly here — same pattern as /api/admin/sync-tracker.
export async function POST(request: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Throttle guesses at the current password, same shape as the login form's limiter.
  const limit = rateLimit(`change-password:${admin.id}`, { limit: 5, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = changePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  if (parsed.data.newPassword === parsed.data.currentPassword) {
    return NextResponse.json(
      { error: 'New password must be different from the current password.' },
      { status: 400 }
    );
  }

  try {
    const result = await updateAdminPassword(admin.id, parsed.data.currentPassword, parsed.data.newPassword);
    if (!result.ok) {
      if (result.error === 'wrongPassword') {
        return NextResponse.json({ error: 'Current password is incorrect.' }, { status: 401 });
      }
      return NextResponse.json({ error: 'Account not found.' }, { status: 404 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
