import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { matchSchema } from '@/lib/validation';
import type { MatchReportData } from '@/lib/matchReportSync';

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

/** The set of cobegMatchIds that already have a cached full report — used by
 * the public matches list to decide which completed matches get a "View
 * Full Report" link, without a separate query per match. */
export async function listReportedMatchIds(): Promise<Set<number>> {
  const rows = await prisma.matchReport.findMany({ select: { cobegMatchId: true } });
  return new Set(rows.map((r) => r.cobegMatchId));
}

/** The cached full per-player report for one match (see lib/matchReportSync.ts),
 * or null if it was never fetched — either because the match predates this
 * feature (no cobegMatchId was ever captured for it) or because it just
 * hasn't been synced yet. Never throws on missing/bad JSON: a corrupted or
 * incomplete cache entry should read as "no report available", not crash
 * the public match page. */
export async function getMatchReport(cobegMatchId: number): Promise<MatchReportData | null> {
  const row = await prisma.matchReport.findUnique({ where: { cobegMatchId } });
  if (!row) return null;
  try {
    return JSON.parse(row.dataJson) as MatchReportData;
  } catch {
    return null;
  }
}
