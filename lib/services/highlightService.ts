import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { playerHighlightSchema } from '@/lib/validation';

type PlayerHighlightInput = z.infer<typeof playerHighlightSchema>;

/** All highlight photos for one player (by their stable in-game ID, not the
 * Player row's `id` — see the PlayerHighlight model comment), newest first. */
export function listHighlightsForPlayer(inGameId: string) {
  return prisma.playerHighlight.findMany({ where: { inGameId }, orderBy: { uploadedDate: 'desc' } });
}

/** For the admin management page — every highlight across every player, newest first. */
export function listAllHighlights() {
  return prisma.playerHighlight.findMany({ orderBy: { uploadedDate: 'desc' } });
}

export function createHighlight(input: PlayerHighlightInput) {
  return prisma.playerHighlight.create({ data: input });
}

/** Deletes the DB row and best-effort cleans up the file on disk. Returns the deleted row, or null if it didn't exist. */
export async function deleteHighlight(id: string) {
  const highlight = await prisma.playerHighlight.findUnique({ where: { id } });
  if (!highlight) return null;

  await prisma.playerHighlight.delete({ where: { id } });

  // Best-effort cleanup of the file on disk if it lives under /public/uploads.
  if (highlight.imageUrl.startsWith('/uploads/')) {
    const filePath = path.join(process.cwd(), 'public', highlight.imageUrl);
    fs.unlink(filePath).catch(() => {
      /* ignore — file may already be gone */
    });
  }

  return highlight;
}
