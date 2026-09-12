import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { trackVisitSchema } from '@/lib/validation';
import { recordVisit } from '@/lib/services/analyticsService';
import { parseUserAgent, isBotUserAgent } from '@/lib/parseUserAgent';
import { rateLimit } from '@/lib/rateLimit';

// Public, unauthenticated, write-only "beacon" endpoint pinged by
// components/VisitTracker.tsx on first load and on every client-side route
// change. Never exposes any data back — the only thing the public ever
// gets from this route is a 204/400/429, and any error is swallowed by the
// tracker itself (a tracking failure must never be visible to a visitor or
// break the page). All the actual analytics data is only ever read from
// /admin/analytics (see lib/services/analyticsService.ts), which is behind
// the site's normal admin-session check in middleware.ts.
export const dynamic = 'force-dynamic';

const VISITOR_COOKIE_NAME = 'nu_visitor';
const VISITOR_COOKIE_MAX_AGE = 60 * 60 * 24 * 365 * 2; // ~2 years — long enough to count real repeat visits

function getClientIp(request: NextRequest): string | null {
  // Netlify's own header for the true client IP on a proxied Function/SSR
  // request — more reliable than x-forwarded-for, which can be rewritten by
  // intermediate proxies. Falls back to the first hop of x-forwarded-for
  // for local dev / other hosts, where the Netlify-specific header won't
  // be present at all.
  const nfIp = request.headers.get('x-nf-client-connection-ip');
  if (nfIp) return nfIp.trim();
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) return forwardedFor.split(',')[0]?.trim() || null;
  return null;
}

interface NetlifyGeo {
  city?: string;
  country?: { code?: string; name?: string };
}

function getGeo(request: NextRequest): { city: string | null; country: string | null; countryCode: string | null } {
  const header = request.headers.get('x-nf-geo');
  if (!header) return { city: null, country: null, countryCode: null };
  try {
    const decoded = Buffer.from(header, 'base64').toString('utf8');
    const geo = JSON.parse(decoded) as NetlifyGeo;
    return {
      city: geo.city || null,
      country: geo.country?.name || null,
      countryCode: geo.country?.code || null,
    };
  } catch {
    // Malformed/unexpected header shape — never let a parsing hiccup here
    // break tracking or, worse, the page that triggered it.
    return { city: null, country: null, countryCode: null };
  }
}

// Defense in depth: the client-side tracker already never pings for an
// /admin path, but a stray or hand-crafted request naming one is still
// dropped here rather than logged, so the visitor log always mirrors real
// public-site traffic only.
function isAdminPath(path: string): boolean {
  return /^\/[a-z]{2}\/admin(\/|$)/i.test(path) || path.startsWith('/admin');
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);
  const limit = rateLimit(`track:${ip ?? 'unknown'}`, { limit: 120, windowSeconds: 600 });
  if (!limit.allowed) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  const parsed = trackVisitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { path, locale, referrer } = parsed.data;

  if (isAdminPath(path)) {
    return NextResponse.json({ ok: true });
  }

  const userAgent = request.headers.get('user-agent');

  // Existing visitor cookie, or a fresh one for a first-ever visit — set
  // either way so the cookie's expiry keeps rolling forward on every visit.
  const existingVisitorId = request.cookies.get(VISITOR_COOKIE_NAME)?.value;
  const visitorId = existingVisitorId || crypto.randomUUID();

  const response = NextResponse.json({ ok: true });
  response.cookies.set(VISITOR_COOKIE_NAME, visitorId, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: VISITOR_COOKIE_MAX_AGE,
  });

  // Bots/crawlers still get a normal 200 (so nothing looks broken to them),
  // but never get a cookie written server-side into the log — a crawler
  // hitting every page would otherwise dominate the "top pages" stats.
  if (isBotUserAgent(userAgent)) {
    return response;
  }

  try {
    const { browser, os, deviceType } = parseUserAgent(userAgent);
    const geo = getGeo(request);
    await recordVisit({
      visitorId,
      path,
      locale: locale || null,
      ipAddress: getClientIp(request),
      country: geo.country,
      countryCode: geo.countryCode,
      city: geo.city,
      userAgent: userAgent || null,
      browser,
      os,
      deviceType,
      referrer: referrer || null,
    });
  } catch (error) {
    // A tracking failure is never allowed to surface to the visitor or the
    // page that triggered it — log server-side and still return success.
    console.error('Failed to record site visit:', error);
  }

  return response;
}
