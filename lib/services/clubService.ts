import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { clubInfoSchema } from '@/lib/validation';

type ClubInfoInput = z.infer<typeof clubInfoSchema>;

/** The singleton club-info row (id is always "main"). */
export function getClubInfo() {
  return prisma.clubInfo.findUnique({ where: { id: 'main' } });
}

export function saveClubInfo(input: ClubInfoInput) {
  const { achievements, ...rest } = input;
  const data = { ...rest, achievementsJson: JSON.stringify(achievements) };
  return prisma.clubInfo.upsert({
    where: { id: 'main' },
    update: data,
    create: { id: 'main', ...data },
  });
}
