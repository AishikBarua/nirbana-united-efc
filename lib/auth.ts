import { cookies } from 'next/headers';
import crypto from 'crypto';
import { prisma } from '@/lib/db';

/**
 * Minimal, dependency-free signed-session implementation.
 *
 * The cookie holds base64url(payload) + "." + HMAC-SHA256(payload, SESSION_SECRET).
 * This is the same shape as a JWT's "header.payload.signature" but without
 * pulling in a JWT library — there is exactly one claim we need (the admin's
 * id and an expiry), so a plain signed payload is simpler to reason about
 * and has no external dependency to keep patched.
 */

const COOKIE_NAME = 'nu_session';
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) {
    throw new Error(
      'SESSION_SECRET is missing or too short. Set a long random value in your .env file.'
    );
  }
  return secret;
}

function base64url(input: Buffer | string): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

function base64urlDecode(input: string): Buffer {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    input.length + ((4 - (input.length % 4)) % 4),
    '='
  );
  return Buffer.from(padded, 'base64');
}

function sign(payload: string): string {
  return base64url(crypto.createHmac('sha256', getSecret()).update(payload).digest());
}

export interface SessionPayload {
  adminId: string;
  email: string;
  exp: number; // unix seconds
}

export function createSessionToken(payload: Omit<SessionPayload, 'exp'>): string {
  const full: SessionPayload = {
    ...payload,
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
  };
  const encodedPayload = base64url(JSON.stringify(full));
  const signature = sign(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export function verifySessionToken(token: string | undefined | null): SessionPayload | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  let expectedSignature: string;
  try {
    expectedSignature = sign(encodedPayload);
  } catch {
    return null;
  }

  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expectedSignature);
  if (sigBuf.length !== expectedBuf.length || !crypto.timingSafeEqual(sigBuf, expectedBuf)) {
    return null;
  }

  try {
    const payload = JSON.parse(base64urlDecode(encodedPayload).toString('utf8')) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}

/** Reads and verifies the session cookie from the current request (Server Components / Route Handlers). */
export function getSession(): SessionPayload | null {
  const token = cookies().get(COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export async function requireAdmin() {
  const session = getSession();
  if (!session) return null;
  const admin = await prisma.admin.findUnique({ where: { id: session.adminId } });
  return admin;
}

export const SESSION_COOKIE_NAME = COOKIE_NAME;
export const SESSION_TTL = SESSION_TTL_SECONDS;
