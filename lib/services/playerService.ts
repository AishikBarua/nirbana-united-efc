import { prisma } from '@/lib/db';
import type { Prisma } from '@prisma/client';
import type { z } from 'zod';
import type { playerSchema } from '@/lib/validation';

type PlayerInput = z.infer<typeof playerSchema>;

const SORT_MAP: Record<string, Prisma.PlayerOrderByWithRelationInput> = {
  joinDate: { joinDate: 'desc' },
  goals: { goals: 'desc' },
  divisionRank: { divisionRank: 'asc' },
  name: { name: 'asc' },
};

/** Roster list, with the same filter/sort options the public roster page and the tracker sync agree on. */
export function listPlayers(options?: { position?: string; division?: string; sort?: string }) {
  const where: Prisma.PlayerWhereInput = {};
  if (options?.position) where.position = options.position;
  if (options?.division) where.divisionRank = options.division;
  const orderBy = SORT_MAP[options?.sort ?? 'joinDate'] ?? SORT_MAP.joinDate;
  return prisma.player.findMany({ where, orderBy });
}

/** Distinct position/division values currently on the roster, for the filter dropdowns. */
export async function listPlayerFilterOptions() {
  const all = await prisma.player.findMany({ select: { position: true, divisionRank: true } });
  return {
    positions: Array.from(new Set(all.map((p) => p.position))).sort(),
    divisions: Array.from(new Set(all.map((p) => p.divisionRank))).sort(),
  };
}

export function getPlayer(id: string) {
  return prisma.player.findUnique({ where: { id } });
}

/** True only if `name` exactly matches a current roster player — used to
 * enforce that a comment's self-declared @name is a real squad member and
 * not an arbitrary made-up name (see app/api/comments/route.ts). This is
 * not identity verification (the public site has no visitor accounts), just
 * a check that the name picked from the roster list is still a real one. */
export async function isCurrentPlayerName(name: string): Promise<boolean> {
  const match = await prisma.player.findFirst({ where: { name }, select: { id: true } });
  return match !== null;
}

/** Site search: players whose name or in-game ID contains `query`. SQLite's
 * `contains` is already case-insensitive for plain ASCII, so no explicit
 * `mode` option is used here — Prisma's `mode: 'insensitive'` isn't
 * supported on the SQLite provider and would throw if passed. */
export function searchPlayers(query: string, limit = 5) {
  return prisma.player.findMany({
    where: { OR: [{ name: { contains: query } }, { inGameId: { contains: query } }] },
    take: limit,
    orderBy: { name: 'asc' },
  });
}

export function getPlayerBySlug(slug: string) {
  return prisma.player.findUnique({ where: { slug } });
}

/**
 * A player's snapshot history, oldest first — the raw points for the
 * profile page's "trend over time" chart. See PlayerStatSnapshot in
 * schema.prisma for why this is keyed by inGameId rather than player id,
 * and why it only has data from the point this feature was added onward.
 */
export function getPlayerStatHistory(inGameId: string) {
  return prisma.playerStatSnapshot.findMany({
    where: { inGameId },
    orderBy: { takenAt: 'asc' },
  });
}

/**
 * Looks a player up from the raw `[slug]` URL segment next-intl's middleware
 * hands the page — which, for any non-ASCII slug (a Bengali name, say), is
 * NOT the plain decoded string: next-intl's locale rewrite leaves it
 * percent-encoded (e.g. "%E0%A6%B8..." instead of the actual characters),
 * so a bare `getPlayerBySlug(param)` silently never matches. Decoding here
 * first fixes that; it's a no-op for a plain ASCII slug (nothing to decode),
 * so it's always safe to call. Falls back to treating the segment as a raw
 * player id, so any already-shared/bookmarked old-style link keeps working.
 */
export async function getPlayerByRouteParam(rawParam: string) {
  let decoded = rawParam;
  try {
    decoded = decodeURIComponent(rawParam);
  } catch {
    // Malformed percent-escape — fall through and try the raw value as-is.
  }
  return (await getPlayerBySlug(decoded)) ?? (await getPlayer(decoded));
}

// ---------------------------------------------------------------------------
// Bengali -> phonetic English transliteration (a "reverse Avro"), used only
// for building URL slugs. A Bengali name's *display* name is left exactly
// as entered everywhere else (roster cards, the profile heading, admin) —
// this only affects the /players/<slug> link, turning something like
// "সৌরভ" into "sourobh" instead of a Bengali-script (or percent-encoded)
// URL. It also sidesteps relying on non-ASCII URLs at all going forward.
//
// This is a best-effort PHONETIC transliteration, not a lookup of anyone's
// personally preferred English spelling — Bengali names are frequently
// spelled several different accepted ways in English (e.g. this scheme
// renders "সৌরভ" as "sourobh", where a person might personally spell it
// "Sourav" or "Sourabh"). That ambiguity is unavoidable for any automatic
// transliteration; if a specific slug ever needs to be corrected by hand,
// that's a one-line admin ask, not a sign this function is broken.
//
// Method: Bengali is an abugida — each consonant carries an implied "o"
// vowel unless followed by a dependent vowel sign (a "matra") or by hasant
// ্ (which marks a consonant cluster with no vowel between the two
// consonants, e.g. ক্ষ). We walk the name character by character and:
//   - emit a vowel sign's own sound right after the consonant it modifies
//     (instead of the implied "o")
//   - emit nothing for hasant itself, and suppress the inherent vowel on
//     the consonant right before it (so ক্ষ -> "k" + "sh", not "kohsho")
//   - drop the trailing implied vowel on the very last letter of the whole
//     name (matches how Bengali names are actually pronounced/spelled in
//     English — "সৌরভ" ends silent, not "sourobho")
// Every key below is written as a quoted string, not a bare identifier —
// a dependent vowel sign like 'া' is a Unicode *combining mark*, not a
// letter, so JS's object-literal shorthand key syntax (bare `া: 'a'`)
// fails to parse ("Unexpected character"). Quoting every key uniformly
// (including the ones that would happen to parse unquoted) avoids relying
// on that distinction at all.
const BENGALI_INDEPENDENT_VOWELS: Record<string, string> = {
  'অ': 'o', 'আ': 'a', 'ই': 'i', 'ঈ': 'ee', 'উ': 'u', 'ঊ': 'oo', 'ঋ': 'ri', 'এ': 'e', 'ঐ': 'oi', 'ও': 'o', 'ঔ': 'ou',
};
const BENGALI_CONSONANTS: Record<string, string> = {
  'ক': 'k', 'খ': 'kh', 'গ': 'g', 'ঘ': 'gh', 'ঙ': 'ng',
  'চ': 'ch', 'ছ': 'chh', 'জ': 'j', 'ঝ': 'jh', 'ঞ': 'ny',
  'ট': 't', 'ঠ': 'th', 'ড': 'd', 'ঢ': 'dh', 'ণ': 'n',
  'ত': 't', 'থ': 'th', 'দ': 'd', 'ধ': 'dh', 'ন': 'n',
  'প': 'p', 'ফ': 'ph', 'ব': 'b', 'ভ': 'bh', 'ম': 'm',
  'য': 'j', 'র': 'r', 'ল': 'l', 'শ': 'sh', 'ষ': 'sh', 'স': 's', 'হ': 'h',
  'ড়': 'r', 'ঢ়': 'rh', 'য়': 'y', 'ৎ': 't',
};
const BENGALI_VOWEL_SIGNS: Record<string, string> = {
  'া': 'a', 'ি': 'i', 'ী': 'ee', 'ু': 'u', 'ূ': 'oo', 'ৃ': 'ri', 'ে': 'e', 'ৈ': 'oi', 'ো': 'o', 'ৌ': 'ou',
};
const BENGALI_DIGITS: Record<string, string> = {
  '০': '0', '১': '1', '২': '2', '৩': '3', '৪': '4', '৫': '5', '৬': '6', '৭': '7', '৮': '8', '৯': '9',
};
const BENGALI_HASANT = '্';

/** True if `text` contains any Bengali-script character (Unicode block U+0980–U+09FF). */
export function containsBengali(text: string): boolean {
  return /[ঀ-৿]/.test(text);
}

export function transliterateBengaliToEnglish(text: string): string {
  const chars = Array.from(text);
  let out = '';
  for (let i = 0; i < chars.length; i++) {
    const c = chars[i];
    const next = chars[i + 1];

    if (BENGALI_DIGITS[c] !== undefined) {
      out += BENGALI_DIGITS[c];
      continue;
    }
    if (c === BENGALI_HASANT) continue; // rendered as "no vowel" by the consonant before it
    if (c === 'ং') { out += 'ng'; continue; } // anusvara
    if (c === 'ঃ') { out += 'h'; continue; } // visarga
    if (c === 'ঁ') { out += 'n'; continue; } // chandrabindu (nasalization)
    if (BENGALI_VOWEL_SIGNS[c] !== undefined) { out += BENGALI_VOWEL_SIGNS[c]; continue; }
    if (BENGALI_INDEPENDENT_VOWELS[c] !== undefined) { out += BENGALI_INDEPENDENT_VOWELS[c]; continue; }
    if (BENGALI_CONSONANTS[c] !== undefined) {
      out += BENGALI_CONSONANTS[c];
      const followedByVowelSign = next !== undefined && BENGALI_VOWEL_SIGNS[next] !== undefined;
      const followedByHasant = next === BENGALI_HASANT;
      const isLastChar = i === chars.length - 1;
      if (!followedByVowelSign && !followedByHasant && !isLastChar) {
        out += 'o'; // the consonant's implied vowel, mid-word only
      }
      continue;
    }
    out += c; // punctuation/whitespace/anything else — keep as-is
  }
  return out;
}

/**
 * Turns a player's name into a URL-friendly slug (e.g. "Oishik Barua" ->
 * "oishik-barua"). A Bengali-script name is transliterated to phonetic
 * English first (see above), so its slug is a plain, readable Latin string
 * just like everyone else's — falls back to "player" only if nothing
 * usable (no letters/numbers) is left after that.
 */
export function slugify(name: string): string {
  const romanized = containsBengali(name) ? transliterateBengaliToEnglish(name) : name;
  const base = romanized
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'player';
}

/** Appends -2, -3, ... until `slug` no longer collides with anything in `taken`. */
export function dedupeSlug(slug: string, taken: Set<string>): string {
  if (!taken.has(slug)) return slug;
  let i = 2;
  while (taken.has(`${slug}-${i}`)) i += 1;
  return `${slug}-${i}`;
}

/** Generates a slug for `name` guaranteed unique against the DB (excluding `excludeId`, for updates). */
async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  const base = slugify(name);
  const candidates = await prisma.player.findMany({
    where: { slug: { startsWith: base }, ...(excludeId ? { id: { not: excludeId } } : {}) },
    select: { slug: true },
  });
  const taken = new Set(candidates.map((p) => p.slug).filter((s): s is string => Boolean(s)));
  return dedupeSlug(base, taken);
}

export function countPlayers() {
  return prisma.player.count();
}

/** Total wins across the whole roster, for the homepage stat tile. */
export async function sumPlayerWins() {
  const players = await prisma.player.findMany({ select: { wins: true } });
  return players.reduce((sum, p) => sum + p.wins, 0);
}

function toPlayerRow(input: PlayerInput) {
  const { squad, ...rest } = input;
  return { ...rest, squadJson: JSON.stringify(squad) };
}

export async function createPlayer(input: PlayerInput) {
  const slug = await generateUniqueSlug(input.name);
  return prisma.player.create({ data: { ...toPlayerRow(input), slug } });
}

export async function updatePlayer(id: string, input: PlayerInput) {
  const slug = await generateUniqueSlug(input.name, id);
  return prisma.player.update({ where: { id }, data: { ...toPlayerRow(input), slug } });
}

export function deletePlayer(id: string) {
  return prisma.player.delete({ where: { id } });
}
