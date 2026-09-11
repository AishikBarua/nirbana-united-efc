import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { galleryImageSchema } from '@/lib/validation';

type GalleryImageInput = z.infer<typeof galleryImageSchema>;

export function listGalleryImages() {
  return prisma.galleryImage.findMany({ orderBy: { uploadedDate: 'desc' } });
}

export function getGalleryImage(id: string) {
  return prisma.galleryImage.findUnique({ where: { id } });
}

export function createGalleryImage(input: GalleryImageInput) {
  return prisma.galleryImage.create({ data: input });
}

/** Deletes the DB row and best-effort cleans up the file on disk. Returns the deleted row, or null if it didn't exist. */
export async function deleteGalleryImage(id: string) {
  const image = await prisma.galleryImage.findUnique({ where: { id } });
  if (!image) return null;

  await prisma.galleryImage.delete({ where: { id } });

  // Best-effort cleanup of the file on disk if it lives under /public/uploads.
  if (image.imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', image.imageUrl);
    fs.unlink(filePath).catch(() => {
      /* ignore — file may already be gone */
    });
  }

  return image;
}
