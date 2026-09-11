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
 * Validates and saves an uploaded image to /public/uploads, returning its
 * public URL.
 *
 * IMPORTANT for production on Vercel (or any platform with an ephemeral/
 * read-only filesystem): writes to /public are NOT persisted between
 * deployments or serverless invocations there. Swap this function's body for
 * an upload to Cloudinary/Supabase Storage/S3 before you deploy — every
 * caller only ever deals with the returned `url` string, so no other code
 * needs to change.
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
  const uploadsDir = path.join(process.cwd(), 'public', 'uploads');

  await fs.mkdir(uploadsDir, { recursive: true });

  const bytes = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(path.join(uploadsDir, filename), bytes);

  return { ok: true, url: `/uploads/${filename}` };
}
