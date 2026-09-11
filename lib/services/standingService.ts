import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { standingSchema } from '@/lib/validation';

type StandingInput = z.infer<typeof standingSchema>;

export function listStandings() {
  return prisma.standing.findMany({ orderBy: { position: 'asc' } });
}

/** The club's own row (isUs: true), for the homepage "League Position" stat tile. */
export function getOurStanding() {
  return prisma.standing.findFirst({ where: { isUs: true } });
}

export function getStanding(id: string) {
  return prisma.standing.findUnique({ where: { id } });
}

export function createStanding(input: StandingInput) {
  return prisma.standing.create({ data: input });
}

export function updateStanding(id: string, input: StandingInput) {
  return prisma.standing.update({ where: { id }, data: input });
}

export function deleteStanding(id: string) {
  return prisma.standing.delete({ where: { id } });
}
