/**
 * Edge-runtime-safe session verification.
 *
 * middleware.ts runs on the Edge runtime, which has the Web Crypto API
 * (globalThis.crypto.subtle) but not Node's `crypto` module or `next/headers`.
 * This file duplicates just the verification half of lib/auth.ts using Web
 * Crypto, so both files must keep producing/checking the exact same token
 * shape: base64url(JSON payload) + "." + base64url(HMAC-SHA256 digest).
 */

export const SESSION_COOKIE_NAME = 'nu_session';

function base64urlToUint8Array(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/').padEnd(
    input.length + ((4 - (input.length % 4)) % 4),
    '='
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function bufferToBase64url(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

async function hmacSign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(payload));
  return bufferToBase64url(signature);
}

export interface SessionPayload {
  adminId: string;
  email: string;
  exp: number;
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionPayload | null> {
  if (!token) return null;
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 16) return null;

  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [encodedPayload, signature] = parts;

  const expectedSignature = await hmacSign(encodedPayload, secret);
  if (signature !== expectedSignature) return null;

  try {
    const json = new TextDecoder().decode(base64urlToUint8Array(encodedPayload));
    const payload = JSON.parse(json) as SessionPayload;
    if (typeof payload.exp !== 'number' || payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
