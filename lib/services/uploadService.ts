import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_BYTES = 5 * 1024 * 1024; // 5MB

const EXT_BY_TYPE: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

export type SaveImageResult = { ok: true; url: string } | { ok: false; error: string };

/**
 * Validates and saves an uploaded image, returning its public URL.
 *
 * Two different storage backends depending on where this is running:
 *   - Local dev (your PC, `npm run dev`): writes to /public/uploads on disk,
 *     exactly as before — nothing about your local workflow changes.
 *   - Netlify: writes to Netlify Blobs instead, since Netlify's deployed
 *     function filesystem is both ephemeral AND read-only (a write there
 *     throws EROFS) — the image is served back by app/api/blob/[key]/route.ts.
 *
 *     Detected via process.env.NETLIFY_BLOBS_CONTEXT rather than
 *     process.env.NETLIFY: NETLIFY is only set during Netlify's *build* step,
 *     not in the deployed function at request time, so checking it here
 *     always took this local-disk branch in production and crashed with
 *     EROFS on every upload. NETLIFY_BLOBS_CONTEXT is the variable Netlify
 *     actually injects into the live function so @netlify/blobs' getStore()
 *     can auto-configure itself — its presence is what really distinguishes
 *     "running deployed on Netlify" from local dev.
 */
export async function saveUploadedImage(file: File): Promise<SaveImageResult> {
  if (!ALLOWED_TYPES.has(file.type)) {
    return { ok: false, error: 'Only JPEG, PNG, WEBP, or GIF images are allowed' };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: 'File is too large (max 5MB)' };
  }

  // Never trust the client-supplied filename — generate our own.
  const ext = EXT_BY_TYPE[file.type];
  const filename = `${crypto.randomUUID()}.${ext}`;

  if (process.env.NETLIFY_BLOBS_CONTEXT) {
    // Dynamically imported so local `npm run dev` never needs this package
    // installed — this branch is only ever reached on Netlify, where
    // package.json's dependency is always freshly installed at build time.
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('image-uploads');
    await store.set(filename, file, { metadata: { contentType: file.type } });
    return { ok: true, url: `/api/blob/${filename}` };
  }

  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(uploadsDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, filename), bytes);

  return { ok: true, url: `/uploads/${filename}` };
}
