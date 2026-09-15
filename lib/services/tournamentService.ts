import { prisma } from '@/lib/db';
import type { z } from 'zod';
import type { tournamentSchema, tournamentMatchSchema, tournamentRoundScheduleSchema } from '@/lib/validation';
import { slugify, dedupeSlug } from '@/lib/services/playerService';

type TournamentInput = z.infer<typeof tournamentSchema>;
type TournamentMatchInput = z.infer<typeof tournamentMatchSchema>;
type RoundScheduleInput = z.infer<typeof tournamentRoundScheduleSchema>;

// Which status an admin is allowed to move a tournament into from its
// current one — keeps a completed/cancelled tournament from silently being
// reopened, and keeps registration from reopening after fixtures exist
// (fixture generation is a later feature, but this list is already shaped
// for it: IN_PROGRESS is a one-way door once reached).
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  REGISTRATION_OPEN: ['REGISTRATION_CLOSED', 'CANCELLED'],
  REGISTRATION_CLOSED: ['REGISTRATION_OPEN', 'IN_PROGRESS', 'CANCELLED'],
  IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
};

export function canTransitionStatus(from: string, to: string): boolean {
  return (ALLOWED_STATUS_TRANSITIONS[from] || []).includes(to);
}

// Every field EXCEPT `accessCode` — used for every public-facing read, so
// the registration passcode can never leak into a public page's HTML/JSON
// (Next.js serializes whatever a Server Component passes to a Client
// Component into the page, so this select is what keeps a careless prop
// spread from ever including it). Admin-facing reads use the full row via
// listTournaments/getTournament instead.
const PUBLIC_TOURNAMENT_SELECT = {
  id: true,
  name: true,
  slug: true,
  description: true,
  status: true,
  registrationDeadline: true,
  startDate: true,
  createdAt: true,
  updatedAt: true,
} as const;

export function listTournaments() {
  return prisma.tournament.findMany({ orderBy: { createdAt: 'desc' } });
}

export function listPublicTournaments() {
  return prisma.tournament.findMany({ orderBy: { createdAt: 'desc' }, select: PUBLIC_TOURNAMENT_SELECT });
}

export function getTournament(id: string) {
  return prisma.tournament.findUnique({ where: { id } });
}

export function getPublicTournament(id: string) {
  return prisma.tournament.findUnique({ where: { id }, select: PUBLIC_TOURNAMENT_SELECT });
}

export function getTournamentBySlug(slug: string) {
  return prisma.tournament.findUnique({ where: { slug } });
}

export function getPublicTournamentBySlug(slug: string) {
  return prisma.tournament.findUnique({ where: { slug }, select: PUBLIC_TOURNAMENT_SELECT });
}

async function generateUniqueTournamentSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  const candidates = await prisma.tournament.findMany({
    where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  });
  const taken = new Set(candidates.map((t) => t.slug));
  return dedupeSlug(base, taken);
}

export async function createTournament(input: TournamentInput) {
  const slug = await generateUniqueTournamentSlug(input.name);
  return prisma.tournament.create({ data: { ...input, slug } });
}

/** Updates the editable fields only — never touches `status` (see
 * updateTournamentStatus for that, which enforces valid transitions). If
 * the name changed, the slug is regenerated (and deduped) to match, same
 * as a player's slug does not follow renames automatically elsewhere in
 * this codebase — but a tournament is admin-only content with no inbound
 * links to preserve, so keeping the slug human-readable after a rename is
 * worth the churn here. */
export async function updateTournament(id: string, input: TournamentInput) {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return null;

  const slug =
    existing.name === input.name ? existing.slug : await generateUniqueTournamentSlug(input.name, id);

  return prisma.tournament.update({ where: { id }, data: { ...input, slug } });
}

export async function updateTournamentStatus(id: string, status: string) {
  const existing = await prisma.tournament.findUnique({ where: { id } });
  if (!existing) return null;
  if (!canTransitionStatus(existing.status, status)) {
    throw new Error(`Cannot move a tournament from ${existing.status} to ${status}`);
  }
  return prisma.tournament.update({ where: { id }, data: { status } });
}

export async function deleteTournament(id: string) {
  // No real foreign key to cascade (see TournamentRegistration's and
  // TournamentMatch's own comments for why), so registrations and fixtures
  // are cleaned up by hand first.
  await prisma.tournamentRegistration.deleteMany({ where: { tournamentId: id } });
  await prisma.tournamentMatch.deleteMany({ where: { tournamentId: id } });
  return prisma.tournament.delete({ where: { id } });
}

export function listRegistrations(tournamentId: string) {
  return prisma.tournamentRegistration.findMany({
    where: { tournamentId },
    orderBy: { registeredAt: 'asc' },
  });
}

export function countRegistrations(tournamentId: string) {
  return prisma.tournamentRegistration.count({ where: { tournamentId } });
}

export function registerForTournament(tournamentId: string, inGameId: string, playerName: string) {
  return prisma.tournamentRegistration.create({ data: { tournamentId, inGameId, playerName } });
}

export function deleteRegistration(id: string) {
  return prisma.tournamentRegistration.delete({ where: { id } });
}

// --- Fixtures ("match day" scheduling + the downloadable fixture card) ---

export function listMatches(tournamentId: string) {
  return prisma.tournamentMatch.findMany({
    where: { tournamentId },
    orderBy: [{ round: 'asc' }, { createdAt: 'asc' }],
  });
}

export function listRoundMatches(tournamentId: string, round: number) {
  return prisma.tournamentMatch.findMany({
    where: { tournamentId, round },
    orderBy: { createdAt: 'asc' },
  });
}

export async function createMatch(tournamentId: string, input: TournamentMatchInput) {
  const [home, away] = await Promise.all([
    prisma.tournamentRegistration.findUnique({
      where: { tournamentId_inGameId: { tournamentId, inGameId: input.homeInGameId } },
    }),
    prisma.tournamentRegistration.findUnique({
      where: { tournamentId_inGameId: { tournamentId, inGameId: input.awayInGameId } },
    }),
  ]);
  if (!home || !away) {
    throw new Error('Both players must be registered for this tournament.');
  }

  return prisma.tournamentMatch.create({
    data: {
      tournamentId,
      round: input.round,
      roundLabel: input.roundLabel || null,
      homeInGameId: home.inGameId,
      homePlayerName: home.playerName,
      awayInGameId: away.inGameId,
      awayPlayerName: away.playerName,
      homeScore: input.homeScore ?? null,
      awayScore: input.awayScore ?? null,
      status: input.status,
    },
  });
}

export async function updateMatch(tournamentId: string, id: string, input: TournamentMatchInput) {
  const existing = await prisma.tournamentMatch.findUnique({ where: { id } });
  if (!existing || existing.tournamentId !== tournamentId) return null;

  const [home, away] = await Promise.all([
    prisma.tournamentRegistration.findUnique({
      where: { tournamentId_inGameId: { tournamentId, inGameId: input.homeInGameId } },
    }),
    prisma.tournamentRegistration.findUnique({
      where: { tournamentId_inGameId: { tournamentId, inGameId: input.awayInGameId } },
    }),
  ]);
  if (!home || !away) {
    throw new Error('Both players must be registered for this tournament.');
  }

  return prisma.tournamentMatch.update({
    where: { id },
    data: {
      round: input.round,
      roundLabel: input.roundLabel || null,
      homeInGameId: home.inGameId,
      homePlayerName: home.playerName,
      awayInGameId: away.inGameId,
      awayPlayerName: away.playerName,
      homeScore: input.homeScore ?? null,
      awayScore: input.awayScore ?? null,
      status: input.status,
    },
  });
}

export function deleteMatch(id: string) {
  return prisma.tournamentMatch.delete({ where: { id } });
}

/** Sets the same `scheduledAt` across every fixture in one round of a
 * tournament at once — this IS the "match day" feature: rather than
 * scheduling each fixture individually, an admin picks one date/time for
 * the whole round. Returns how many fixtures were updated (0 means that
 * round doesn't exist / has no fixtures yet for this tournament). */
export async function scheduleRound(tournamentId: string, input: RoundScheduleInput) {
  const result = await prisma.tournamentMatch.updateMany({
    where: { tournamentId, round: input.round },
    data: { scheduledAt: input.scheduledAt },
  });
  return result.count;
}
