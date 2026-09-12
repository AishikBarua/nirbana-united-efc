import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { clubInfoSchema } from '@/lib/validation';

type ClubInfoInput = z.infer<typeof clubInfoSchema>;

/** The singleton club-info row (id is always "main"). */
export function getClubInfo() {
  return prisma.clubInfo.findUnique({ where: { id: 'main' } });
}

export function saveClubInfo(input: ClubInfoInput) {
  const { achievements, tagline, founded, history, ...rest } = input;
  // The form (and its zod schema) allows these to be cleared to null, but the
  // database columns are plain non-nullable strings with empty-string
  // defaults (see prisma/schema.prisma / schema.production.prisma) — so a
  // cleared field is stored as "", not null.
  const data = {
    ...rest,
    tagline: tagline ?? '',
    founded: founded ?? '',
    history: history ?? '',
    achievementsJson: JSON.stringify(achievements),
  };
  return prisma.clubInfo.upsert({
    where: { id: 'main' },
    update: data,
    create: { id: 'main', ...data },
  });
}
