import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { matchSchema } from '@/lib/validation';

type MatchInput = z.infer<typeof matchSchema>;

export function listMatches() {
  return prisma.match.findMany({ orderBy: { date: 'desc' } });
}

export function listUpcomingMatches() {
  return prisma.match.findMany({ where: { status: 'UPCOMING' }, orderBy: { date: 'asc' } });
}

export function listCompletedMatches() {
  return prisma.match.findMany({ where: { status: 'COMPLETED' }, orderBy: { date: 'desc' } });
}

/** Last `limit` played matches (win, draw, or loss — result doesn't matter),
 * newest first, for the homepage "Recent Matches" card. */
export function getRecentResults(limit = 4) {
  return prisma.match.findMany({ where: { status: 'COMPLETED' }, orderBy: { date: 'desc' }, take: limit });
}

/** Soonest `limit` upcoming fixtures, for the homepage "Next Fixtures" card —
 * so visitors (and the squad) can see what's coming up, not just the very
 * next one. */
export function getUpcomingFixtures(limit = 2) {
  return prisma.match.findMany({ where: { status: 'UPCOMING' }, orderBy: { date: 'asc' }, take: limit });
}

export function getMatch(id: string) {
  return prisma.match.findUnique({ where: { id } });
}

/** Site search: matches whose opponent or competition name contains `query`. */
export function searchMatches(query: string, limit = 5) {
  return prisma.match.findMany({
    where: { OR: [{ opponent: { contains: query } }, { competition: { contains: query } }] },
    take: limit,
    orderBy: { date: 'desc' },
  });
}

export function createMatch(input: MatchInput) {
  return prisma.match.create({ data: input });
}

export function updateMatch(id: string, input: MatchInput) {
  return prisma.match.update({ where: { id }, data: input });
}

export function deleteMatch(id: string) {
  return prisma.match.delete({ where: { id } });
}
