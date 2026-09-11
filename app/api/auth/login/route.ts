import { NextRequest, NextResponse } from 'next/server';
import { createSessionToken, SESSION_COOKIE_NAME, SESSION_TTL } from '@/lib/auth';
import { loginSchema } from '@/lib/validation';
import { rateLimit } from '@/lib/rateLimit';
import { verifyAdminCredentials } from '@/lib/services/authService';

export async function POST(request: NextRequest) {
  // Throttle brute-force attempts: 5 tries per minute, keyed by IP + email.
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid email or password format' }, { status: 400 });
  }
  const { email, password } = parsed.data;

  const limit = rateLimit(`login:${ip}:${email.toLowerCase()}`, { limit: 5, windowSeconds: 60 });
  if (!limit.allowed) {
    return NextResponse.json(
      { error: 'Too many attempts. Please try again shortly.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSeconds) } }
    );
  }

  const admin = await verifyAdminCredentials(email, password);
  if (!admin) {
    return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
  }

  const token = createSessionToken({ adminId: admin.id, email: admin.email });

  const response = NextResponse.json({ ok: true });
  response.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_TTL,
  });
  return response;
}
