/**
 * The actual engine behind "sync with the tracker" — fetching, parsing,
 * cross-validating, and (only if everything checks out) writing the club's
 * live cobegbd.com tracker data into this app's own database.
 *
 * This lives in lib/ (not prisma/) so it can be called from TWO places:
 *   1. prisma/sync-from-tracker.ts — the CLI script behind the local
 *      "sync-with-tracker.bat" double-click file.
 *   2. app/api/admin/sync-tracker/route.ts — a POST route an admin can
 *      trigger with one click from /admin/dashboard, once this site is
 *      running on a real server (see below for why that route exists).
 *
 * Why both exist: this app is meant to run two ways. On your own PC via
 * the .bat files (see README), the .bat is the natural "run a script"
 * button. Once you deploy the site to a real host (see the README's
 * "Deploying for free" section), nobody should need a copy of this
 * project's source code or a .bat file just to refresh the data — the
 * admin should be able to click a button right there in /admin instead.
 * Both paths call this exact same function, so the behavior (what's
 * fetched, how it's validated, what's preserved) is identical either way
 * — there is only one sync engine to keep correct.
 *
 * This module deliberately never writes to the filesystem (no fs, no
 * regenerating a source file) — only to the database, through the same
 * Prisma client the rest of the app uses. That's what makes the API-route
 * path possible at all: most hosts (Vercel included) run your server code
 * on a read-only or ephemeral filesystem, so a script that "updates the
 * website" by rewriting a .ts file only works when you can run it locally
 * and commit the result. Writing to the database instead works the same
 * way whether this function is called from your own PC or from a live
 * server, which is the whole point.
 *
 * What this does:
 *   1. Fetches the tracker's club header, Rounds (match history), Fixtures
 *      (upcoming matches), Squad, Match Stats, Transfers, Rankings, and
 *      Round Stats pages directly (they're public, no login needed).
 *   2. Parses the real data out of each page's HTML.
 *   3. Cross-checks the parsed numbers against each other (e.g. the sum of
 *      every player's matches/wins/draws/losses must exactly equal the
 *      tracker's own "All Players Contributions" totals; the sum of every
 *      parsed match result must exactly equal the tracker's own Round
 *      Stats totals). If anything doesn't add up — which usually means the
 *      tracker changed its page layout and a parser needs updating, not
 *      that the data actually changed — NOTHING is written to the database.
 *   4. Only once every check passes does it update the database (Matches,
 *      Players, ClubInfo, Standings, Transfers, RankingSnapshots).
 *
 * What it deliberately preserves and never overwrites:
 *   - Player photos uploaded via /admin (matched by in-game UID)
 *   - Player position/role, join date, favorite player, and "featured" flag
 *     (the tracker doesn't publish these — they're set by hand in /admin,
 *     except for the club's five named officers, whose position is set
 *     automatically from the tracker's own leadership info every run)
 *   - News, Standings' league-table rows (if you ever add real ones),
 *     and Gallery images
 *
 * What it does NOT sync (by design):
 *   - The tracker's "Team-up" tab (per-player 1-on-1 sub-match results) —
 *     far too granular for the current database schema.
 *
 * Upcoming fixtures: the tracker's Fixtures tab DOES publish the actual
 * opponent, date, and round for future matches (confirmed by inspecting its
 * live markup — an earlier version of this comment claimed otherwise, but
 * that's no longer true, if it ever was). parseFixtures() below reads it and
 * writes UPCOMING Match rows alongside the COMPLETED ones from Rounds.
 */
import { prisma } from './db';
import { slugify, dedupeSlug, containsBengali } from './services/playerService';
import { createNotifications, pruneOldNotifications } from './services/notificationService';
import { syncMatchReports } from './matchReportSync';

const CLUB_ID = '250918042901790';
const BASE = 'https://cobegbd.com/club/';

// ---------------------------------------------------------------------------
// Fetch helpers
// ---------------------------------------------------------------------------

// Realistic desktop-Chrome headers rather than an obvious bot-style UA —
// still fetching the same public, no-login page, nothing here impersonates
// a signed-in user or bypasses any access control.
const BROWSER_LIKE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

// The real bug behind "Could not find the Fixtures tab's All dates (N)
// total" (and, silently, every other tab too): Next.js patches the global
// fetch() in server code to cache responses by default. Every single sync
// — the dashboard button, the hourly background job, all of them — was
// hitting that same cache instead of the tracker's live page, so once one
// fetch got cached, ALL later syncs kept replaying that exact same
// snapshot forever, no matter what actually changed on the tracker.
// cache: 'no-store' turns that caching off for these calls, which a sync
// tool must always do — this is supposed to read the tracker's current
// state, every time, not the state from whenever it first got cached.
async function fetchTab(tab: string): Promise<string> {
  const url = `${BASE}?tabs=${tab}&id=${CLUB_ID}&ovr_lazy_tab=${tab}`;
  const res = await fetch(url, { headers: BROWSER_LIKE_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetching tracker tab "${tab}" failed: HTTP ${res.status}`);
  return res.text();
}

function paneOf(html: string, tab: string): string {
  const marker = `data-tab-pane="${tab}"`;
  const idx = html.indexOf(marker);
  if (idx === -1) throw new Error(`Could not find the "${tab}" section in the tracker's page — it may have changed layout.`);
  return html.slice(idx);
}

// ---------------------------------------------------------------------------
// Small string-based extraction helpers (no HTML-parser dependency needed —
// every piece of markup we rely on is a flat, repeated, well-known template)
// ---------------------------------------------------------------------------

function splitChunks(html: string, startNeedle: string): string[] {
  const parts = html.split(startNeedle);
  return parts.slice(1); // parts[0] is whatever came before the first chunk
}

function firstMatch(text: string, re: RegExp): string | undefined {
  const m = re.exec(text);
  return m?.[1]?.trim();
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#038;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .trim();
}

/** Parses a "<div><i>..</i><span>Label</span><strong>Value</strong></div>" style KPI
 * block (used by both the Match Stats "All-Time Statistics" card and the Round
 * Stats "All-Time Statistics" card) into a plain { Label: "Value" } map. */
function parseKpiBlock(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<span>([^<]+)<\/span><strong>([^<]+)<\/strong>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    out[m[1].trim()] = m[2].trim();
  }
  return out;
}

function kpiInt(kpi: Record<string, string>, label: string): number {
  const raw = kpi[label];
  if (raw === undefined) throw new Error(`Expected "${label}" in tracker stats block but it wasn't there.`);
  const n = parseInt(raw.replace(/[^\d-]/g, ''), 10);
  if (Number.isNaN(n)) throw new Error(`Could not read "${label}" as a number (got "${raw}").`);
  return n;
}

// ---------------------------------------------------------------------------
// Parsers
// ---------------------------------------------------------------------------

type ClubHeader = {
  clubName: string;
  tagline: string;
  division: string;
  president: string;
  location: string;
  generalSecretary: string;
  captain: string;
  viceCaptain: string;
  playersCount: number;
  facebookUrl?: string;
};

function parseHeader(html: string): ClubHeader {
  const clubName = decodeEntities(firstMatch(html, /cobeg-cinfo-club-header__title">\s*<span>([^<]+)<\/span>/) ?? '');
  const tagline = decodeEntities(firstMatch(html, /cobeg-cinfo-club-header__quote">\s*([\s\S]*?)<\/div>/) ?? '')
    .replace(/[""]/g, '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
    .join(' ');
  const division = decodeEntities(firstMatch(html, /cobeg-cinfo-stage-pill">([^<]+)</) ?? 'FOUNDATION');
  const facebookUrl = firstMatch(html, /cobeg-cinfo-contact-btn"[^>]*href="([^"]+)"/) ?? firstMatch(html, /href="([^"]*facebook\.com[^"]*)"/);

  const metaCards = splitChunks(html, '<div class="cobeg-cinfo-meta-card">').map((chunk) => {
    const label = decodeEntities(firstMatch(chunk, /<h4>([^<]+)<\/h4>/) ?? '');
    const value = decodeEntities(firstMatch(chunk, /<p>([^<]*)<\/p>/) ?? '');
    return [label, value] as const;
  });
  const meta = Object.fromEntries(metaCards);

  return {
    clubName: clubName || 'Nirbana United EFC',
    tagline: tagline || 'Meditate. Dominate. Celebrate.',
    division,
    president: meta['President'] ?? '',
    location: meta['Location'] ?? '',
    generalSecretary: meta['General Secretary'] ?? '',
    captain: meta['Captain'] ?? '',
    viceCaptain: meta['Vice-Captain'] ?? '',
    playersCount: parseInt(meta['Players'] ?? '0', 10),
    facebookUrl: facebookUrl ? decodeEntities(facebookUrl) : undefined,
  };
}

type ParsedMatch = {
  opponent: string;
  opponentSquad: string;
  ourSquad: string;
  dateMs: number;
  ourScore: number;
  opponentScore: number;
  result: 'W' | 'D' | 'L';
  competition: string;
  group: string;
  // The tracker's own numeric match-report id for this COMPLETED match,
  // read straight off this round card's own `onclick="location.href='
  // https://cobegbd.com/match/?id=N'"` handler — NOT a plain `<a href>`,
  // which is why an earlier pass at this (see the Match model's
  // `cobegMatchId` field comment, and lib/matchReportSync.ts's header
  // comment) concluded the id "disappears" once a match leaves the
  // Fixtures tab. It doesn't — it just moves to this onclick attribute
  // instead. Confirmed live: every one of the tracker's current Rounds-tab
  // cards carries this. The tracker only ever shows a limited recent
  // window of rounds though (its own "All (N)" filter caps out), so a
  // match old enough to have scrolled out of that window still won't have
  // one here — trackerSync.ts falls back to whatever id (auto-captured
  // earlier, or pasted in by an admin) that match already had.
  cobegMatchId?: number;
};

function parseRounds(html: string): ParsedMatch[] {
  const pane = paneOf(html, 'rounds');
  const chunks = splitChunks(pane, '<article class="match-card"');
  const matches: ParsedMatch[] = [];
  for (const chunk of chunks) {
    const dateTs = firstMatch(chunk, /data-date-ts="(\d+)"/);
    const ourSquad = decodeEntities(firstMatch(chunk, /pill-text">([^<]+)</) ?? 'Main');
    const tour = decodeEntities(firstMatch(chunk, /mi-tour">([^<]+)</) ?? '');
    const [group, competition] = tour.includes('•') ? tour.split('•').map((s) => s.trim()) : ['', tour];
    const opponent = decodeEntities(firstMatch(chunk, /mi-opponent">[\s\S]*?<a[^>]*>([^<]+)</) ?? '');
    const opponentSquad = decodeEntities(firstMatch(chunk, /opp-meta">([^<]*)</) ?? '');
    const scoreGoals = firstMatch(chunk, /score-goals">([^<]+)</);
    const resultClass = firstMatch(chunk, /score-res (\w)"/);
    if (!dateTs || !scoreGoals || !resultClass || !opponent) continue; // skip anything we can't fully read
    const [ourScoreStr, opponentScoreStr] = scoreGoals.split(/[–-]/).map((s) => s.trim());
    const result = resultClass.toUpperCase() as 'W' | 'D' | 'L';
    const cobegMatchIdStr = firstMatch(chunk, /onclick="location\.href='https:\/\/cobegbd\.com\/match\/\?id=(\d+)'/);
    matches.push({
      opponent,
      opponentSquad,
      ourSquad,
      dateMs: parseInt(dateTs, 10) * 1000,
      ourScore: parseInt(ourScoreStr, 10),
      opponentScore: parseInt(opponentScoreStr, 10),
      result,
      competition: competition || 'Match',
      group,
      cobegMatchId: cobegMatchIdStr ? parseInt(cobegMatchIdStr, 10) : undefined,
    });
  }
  return matches;
}

type ParsedFixture = {
  opponent: string;
  opponentSquad: 'Main' | 'Academy' | '';
  dateMs: number;
  round: string;
  // The tracker's own numeric match id, read straight off this fixture
  // card's own href (".../match/?id=N") — see the Match model's
  // `cobegMatchId` field comment for why this only exists on the Fixtures
  // tab, not the completed-results one.
  cobegMatchId?: number;
};

/** Squad-type marker emoji the tracker puts next to a fixture's opponent —
 * 👤 for their Main squad, 🅰️ for their Academy squad. Matches the same
 * "Opponent fielded their X squad" convention already used for completed
 * matches (parseRounds' opponentSquad, via the Rounds tab's own opp-meta
 * text) — this is just the Fixtures tab's equivalent for matches that
 * haven't happened yet.
 *
 * Checks base codepoints rather than exact string equality, since the "🅰️"
 * emoji is the letter-A codepoint plus an optional trailing variation
 * selector (U+FE0F) that different sources don't always include — matching
 * on the base character is robust to that either way. */
function squadFromEmoji(emoji: string | undefined): 'Main' | 'Academy' | '' {
  if (!emoji) return '';
  if (emoji.includes('\u{1F464}')) return 'Main'; // 👤 bust in silhouette
  if (emoji.includes('\u{1F170}')) return 'Academy'; // 🅰 negative squared letter A
  return '';
}

/** How many fixtures the tracker itself says exist, from the Fixtures tab's
 * own "All dates (N)" filter option — used to cross-validate that we parsed
 * every one of them, the same spirit as the Rounds-vs-Round-Stats check
 * below.
 *
 * The `(?:="")?` matters: the tracker's real, raw server HTML writes this as
 * a bare attribute (`data-fixture-date>`, no value at all) — a browser
 * normalizes that to `data-fixture-date=""` when you read an already-loaded
 * page's outerHTML back out, which is what an earlier check of this parser
 * was (misleadingly) verified against. The actual sync fetches the tracker
 * with a plain HTTP request, no browser involved, so it sees the bare form
 * and needs to match it too. */
function parseFixtureTotalCount(pane: string): number {
  const raw = firstMatch(pane, /data-fixture-date(?:="")?>\s*<option value="all">All dates \((\d+)\)<\/option>/);
  if (raw === undefined) throw new Error('Could not find the Fixtures tab\'s "All dates (N)" total.');
  return parseInt(raw, 10);
}

function parseFixtures(html: string): ParsedFixture[] {
  const pane = paneOf(html, 'fixtures');
  const expectedCount = parseFixtureTotalCount(pane);

  const chunks = splitChunks(pane, '<a class="ovr-fixture-row');
  const fixtures: ParsedFixture[] = [];
  for (const chunk of chunks) {
    const dateTs = firstMatch(chunk, /data-date-ts="(\d+)"/);
    const round = decodeEntities(firstMatch(chunk, /ovr-fixture-row-head">\s*<span>[^<]*<\/span>\s*<b>([^<]+)<\/b>/) ?? '');
    if (!dateTs) continue; // not a real fixture card (e.g. trailing script/markup after the list)

    // The fixture card's own opening tag is `<a ... href="https://cobegbd.com/match/?id=N" ...>`
    // (this function's chunk splitter already cuts right after `<a class="ovr-fixture-row`,
    // so the href is right at the start of `chunk`) — this is the ONLY place
    // the tracker exposes this match's id anywhere on the club page. See the
    // Match model's `cobegMatchId` field comment.
    const matchIdStr = firstMatch(chunk, /^[^>]*href="https:\/\/cobegbd\.com\/match\/\?id=(\d+)"/);
    const cobegMatchId = matchIdStr ? parseInt(matchIdStr, 10) : undefined;

    // Each fixture has exactly two "side" blocks (home/away, order varies —
    // our own club can be on either side of any given fixture). Whichever
    // side's crest URL contains our own CLUB_ID is us; the other is the
    // opponent. Matching by ID rather than by name sidesteps any name/case
    // mismatch between how the tracker spells the club name here vs. on the
    // header (e.g. "Efc" vs "EFC").
    const sideRe = /<div class="ovr-fixture-side is-(?:home|away)">([\s\S]*?)<\/div>/g;
    const sides: { name: string; isUs: boolean; emoji?: string }[] = [];
    let sm: RegExpExecArray | null;
    while ((sm = sideRe.exec(chunk))) {
      const block = sm[1];
      sides.push({
        name: decodeEntities(firstMatch(block, /<strong>([^<]+)<\/strong>/) ?? ''),
        isUs: new RegExp(`avatar/${CLUB_ID}-`).test(block),
        emoji: firstMatch(block, /<em>([^<]+)<\/em>/),
      });
    }
    const opponent = sides.find((s) => !s.isUs);
    const us = sides.find((s) => s.isUs);
    if (sides.length !== 2 || !opponent || !us || !opponent.name) continue; // can't tell who's playing whom — skip rather than guess

    fixtures.push({
      opponent: opponent.name,
      opponentSquad: squadFromEmoji(opponent.emoji),
      dateMs: parseInt(dateTs, 10) * 1000,
      round: round || 'Match',
      cobegMatchId,
    });
  }

  if (fixtures.length !== expectedCount) {
    throw new Error(
      `Parsed ${fixtures.length} fixtures but the tracker's own Fixtures tab says there are ${expectedCount} — refusing to guess which are missing.`
    );
  }
  return fixtures;
}

type SquadPlayer = {
  name: string;
  inGameId: string;
  device?: string;
  jersey?: string;
  rank?: string;
  allTimePlayed: number;
  allTimeWins: number;
  allTimeGoals: number;
};

function parseSquad(html: string): SquadPlayer[] {
  const pane = paneOf(html, 'squad');
  const chunks = splitChunks(pane, '<div class="player-card ');
  const players: SquadPlayer[] = [];
  for (const chunk of chunks) {
    const name = decodeEntities(
      firstMatch(chunk, /<h3 class="squad-player-name-row">\s*<a[^>]*>\s*([^<]*?)\s*<\/a>/) ?? ''
    );
    if (!name) continue;
    const uid = decodeEntities(firstMatch(chunk, /UID:\s*<strong>([^<]*)<\/strong>/) ?? '');
    const device = decodeEntities(firstMatch(chunk, /Device:\s*<strong>([^<]*)<\/strong>/) ?? '');
    const jersey = firstMatch(chunk, /squad-shirt-float">#?([^<]+)</);
    const rank = firstMatch(chunk, /data-alltime-rank="(\d+)"/);
    const pl = firstMatch(chunk, /data-alltime-pl="(\d+)"/);
    const w = firstMatch(chunk, /data-alltime-w="(\d+)"/);
    const gf = firstMatch(chunk, /data-alltime-gf="(\d+)"/);
    players.push({
      name,
      inGameId: uid || name, // a handful of legacy entries have no UID; fall back to name so they still get a stable-ish key
      device: device || undefined,
      jersey: jersey ? `#${jersey}` : undefined,
      rank: rank && rank !== '0' ? `#${rank}` : undefined,
      allTimePlayed: pl ? parseInt(pl, 10) : 0,
      allTimeWins: w ? parseInt(w, 10) : 0,
      allTimeGoals: gf ? parseInt(gf, 10) : 0,
    });
  }
  return players;
}

type StatsPlayer = { name: string; played: number; wins: number; draws: number; losses: number };

function parseMatchStatsPlayers(html: string): StatsPlayer[] {
  const pane = paneOf(html, 'match-statistics');
  const chunks = splitChunks(pane, '<a class="ovr-player-stat-card"');
  const players: StatsPlayer[] = [];
  for (const chunk of chunks) {
    const name = decodeEntities(firstMatch(chunk, /<strong>([^<]+)<\/strong>/) ?? '');
    const line = firstMatch(chunk, /<small>([^<]+)<\/small>/) ?? '';
    const m = /(\d+)\s*PL\D+(\d+)\s*W\D+(\d+)\s*D\D+(\d+)\s*L/.exec(line);
    if (!name || !m) continue;
    players.push({ name, played: +m[1], wins: +m[2], draws: +m[3], losses: +m[4] });
  }
  return players;
}

function parseMatchStatsAllTime(html: string): Record<string, string> {
  const pane = paneOf(html, 'match-statistics');
  const idx = pane.indexOf('All-Time Statistics');
  if (idx === -1) throw new Error('Could not find "All-Time Statistics" on the Match Stats tab.');
  const blockEnd = pane.indexOf('</article>', idx);
  return parseKpiBlock(pane.slice(idx, blockEnd === -1 ? undefined : blockEnd));
}

type SeasonForm = { name: string; played: number; winPct: number; gd: number; wins: number; gf: number; ga: number };

/** The tracker's own current-season label (e.g. "Season 2026"), read fresh
 * from right next to "Squad Player Form Details" on every sync — NEVER
 * hardcoded — so the per-player season line in each bio stays correct on
 * its own once the tracker rolls over to a new season (the club's Rankings
 * tab already shows a newer "eFootball 2027" scope alongside "eFootball
 * 2026", confirming this tracker does roll seasons over over time; that's a
 * different season-naming scheme than this Match Stats tab's own label, but
 * either way this function reads whatever heading is really there instead
 * of assuming it never changes). */
function parseSeasonLabel(pane: string): string | undefined {
  const label = decodeEntities(firstMatch(pane, /<span>([^<]+)<\/span>\s*<h2>Squad Player Form Details<\/h2>/) ?? '');
  return label || undefined;
}

function parseSeasonForm(html: string): SeasonForm[] {
  const pane = paneOf(html, 'match-statistics');
  const startIdx = pane.indexOf('Squad Player Form Details');
  if (startIdx === -1) return [];
  const endIdx = pane.indexOf('Match History', startIdx);
  const section = pane.slice(startIdx, endIdx === -1 ? undefined : endIdx);
  const chunks = splitChunks(section, '<a class="ovr-season-player-detail"');
  const out: SeasonForm[] = [];
  for (const chunk of chunks) {
    const name = decodeEntities(firstMatch(chunk, /<strong>([^<]+)<\/strong>/) ?? '');
    const line = firstMatch(chunk, /<small>([^<]+)<\/small>/) ?? '';
    const m = /(\d+)\s*PL\s*·\s*([\d.]+)%\s*Win\s*·\s*GD\s*(-?\d+)/.exec(line);
    const bValues = [...chunk.matchAll(/<b>(-?\d+)\s*(?:W|GF|GA)<\/b>/g)].map((x) => parseInt(x[1], 10));
    if (!name || !m || bValues.length < 3) continue;
    out.push({ name, played: +m[1], winPct: parseFloat(m[2]), gd: +m[3], wins: bValues[0], gf: bValues[1], ga: bValues[2] });
  }
  return out;
}

type TransferEvent = { date: string; type: 'NEW_REGISTER' | 'TRANSFER' | 'UNREGISTER'; player: string; squad: string; fromClub?: string };

function parseTransfers(html: string): TransferEvent[] {
  const pane = paneOf(html, 'transfers');
  const chunks = splitChunks(pane, 'data-transfer-card');
  const typeMap: Record<string, TransferEvent['type']> = {
    'new register': 'NEW_REGISTER',
    transfer: 'TRANSFER',
    unregister: 'UNREGISTER',
  };
  const out: TransferEvent[] = [];
  for (const chunk of chunks) {
    const typeRaw = firstMatch(chunk, /data-type="([^"]+)"/);
    const dateRaw = firstMatch(chunk, /ovr-tlog-date">([^<]+)</);
    const player = decodeEntities(firstMatch(chunk, /ovr-tlog-name">\s*<a[^>]*>([^<]+)</) ?? '');
    const metaRaw = decodeEntities(firstMatch(chunk, /ovr-tlog-meta">([^<]+)</) ?? '');
    if (!typeRaw || !dateRaw || !player) continue;
    const type = typeMap[typeRaw.toLowerCase()];
    if (!type) continue;
    const date = new Date(dateRaw).toISOString().slice(0, 10);
    const [squad, fromClub] = metaRaw.includes(' from ') ? metaRaw.split(' from ').map((s) => s.trim()) : [metaRaw, undefined];
    out.push({ date, type, player, squad, fromClub });
  }
  return out;
}

type RankingSnapshotParsed = {
  scope: string;
  position: number;
  division: string;
  played: number;
  wins: number;
  draws: number;
  goalsFor: number;
  goalsAgainst: number;
  winPct: number;
  rating: number;
};

function parseRankings(html: string): RankingSnapshotParsed[] {
  const pane = paneOf(html, 'rankings');
  const chunks = splitChunks(pane, '<article class="ovr-rank-section">');
  const out: RankingSnapshotParsed[] = [];
  for (const chunk of chunks) {
    const kickerMatch = /<span>([^<]+)<\/span><h2>([^<]+)<\/h2>/.exec(chunk);
    if (!kickerMatch) continue;
    const scopeType = kickerMatch[1].trim(); // "All-Time" or "Season"
    const scopeName = decodeEntities(kickerMatch[2]);
    const scope = scopeType === 'All-Time' ? 'All-Time' : scopeName;
    const position = firstMatch(chunk, /ovr-rank-badge">#(\d+)</);
    const division = decodeEntities(firstMatch(chunk, /<small>([^<]+)<\/small>/) ?? '');
    const metrics = [...chunk.matchAll(/<span><b>([^<]+)<\/b><em>([^<]+)<\/em><\/span>/g)];
    const byLabel: Record<string, string> = {};
    for (const [, val, label] of metrics) byLabel[label.trim()] = val.trim();
    if (!position || !byLabel['PL']) continue;
    const [gf, ga] = (byLabel['GF:GA'] ?? '0:0').split(':').map((s) => parseInt(s, 10));
    out.push({
      scope,
      position: parseInt(position, 10),
      division: division || 'FOUNDATION',
      played: parseInt(byLabel['PL'], 10),
      wins: parseInt(byLabel['W'], 10),
      draws: parseInt(byLabel['D'], 10),
      goalsFor: gf,
      goalsAgainst: ga,
      winPct: parseFloat((byLabel['Win'] ?? '0').replace('%', '')),
      rating: parseFloat(byLabel['Rating'] ?? '0'),
    });
  }
  return out;
}

function parseRoundStatsKpi(html: string): Record<string, string> {
  const pane = paneOf(html, 'round-statistics');
  const idx = pane.indexOf('ovr-rstat-kpis');
  if (idx === -1) throw new Error('Could not find the Round Stats all-time KPI block.');
  const blockEnd = pane.indexOf('</div></div>', idx);
  return parseKpiBlock(pane.slice(idx, blockEnd === -1 ? undefined : blockEnd));
}

// ---------------------------------------------------------------------------
// Result type — the caller (CLI script or API route) decides how to report
// this; this module itself never calls process.exit or throws on a data
// mismatch, only on a genuine fetch/network failure.
// ---------------------------------------------------------------------------

export type SyncResult =
  | {
      ok: true;
      summary: {
        players: number;
        matches: number;
        fixtures: number;
        transfers: number;
        rankings: number;
        officialRecord: { played: number; wins: number; draws: number; losses: number; gf: number; ga: number };
      };
    }
  | { ok: false; problems: string[] };

export async function runTrackerSync(): Promise<SyncResult> {
  const [headerHtml, roundsHtml, squadHtml, statsHtml, transfersHtml, rankingsHtml, roundStatsHtml, fixturesHtml] = await Promise.all([
    fetchTab('overview'),
    fetchTab('rounds'),
    fetchTab('squad'),
    fetchTab('match-statistics'),
    fetchTab('transfers'),
    fetchTab('rankings'),
    fetchTab('round-statistics'),
    fetchTab('fixtures'),
  ]);

  const header = parseHeader(headerHtml);
  const matches = parseRounds(roundsHtml);
  const squad = parseSquad(squadHtml);
  const statsPlayers = parseMatchStatsPlayers(statsHtml);
  const statsAllTime = parseMatchStatsAllTime(statsHtml);
  const seasonForm = parseSeasonForm(statsHtml);
  // e.g. "Season 2026" today — read fresh every sync (see parseSeasonLabel)
  // rather than assumed, so this doesn't go stale the moment the tracker
  // rolls it forward.
  const seasonLabel = parseSeasonLabel(paneOf(statsHtml, 'match-statistics'));
  // Avoid an awkward "Season 2026 season" if the tracker's own label already
  // contains the word "season" in some form.
  const seasonPhrase = seasonLabel ? (/season/i.test(seasonLabel) ? seasonLabel : `${seasonLabel} season`) : 'This season';
  const transfers = parseTransfers(transfersHtml);
  const rankings = parseRankings(rankingsHtml);
  const roundStatsKpi = parseRoundStatsKpi(roundStatsHtml);

  // --- Cross-validation: refuse to write anything unless the numbers agree
  // with each other, the same way a careful manual check would. -----------
  const problems: string[] = [];

  // Fixtures get the same "don't write anything until it checks out"
  // treatment as everything else, but its own parse failure is caught here
  // (rather than left to crash the whole sync) since it's independent of
  // every other check below — one bad fixtures-tab layout change shouldn't
  // read as a fetch/network failure when it's really a data problem like
  // the others.
  let fixtures: ParsedFixture[] = [];
  try {
    fixtures = parseFixtures(fixturesHtml);
  } catch (e) {
    problems.push(e instanceof Error ? e.message : String(e));
  }

  if (squad.length === 0) problems.push('Parsed 0 players from the Squad tab.');
  if (header.playersCount && squad.length !== header.playersCount) {
    problems.push(`Squad tab has ${squad.length} players but the club header says ${header.playersCount}.`);
  }

  if (matches.length === 0) problems.push('Parsed 0 matches from the Rounds tab.');
  const sumPlayed = matches.length;
  const sumWins = matches.filter((m) => m.result === 'W').length;
  const sumDraws = matches.filter((m) => m.result === 'D').length;
  const sumLosses = matches.filter((m) => m.result === 'L').length;
  const sumGf = matches.reduce((s, m) => s + m.ourScore, 0);
  const sumGa = matches.reduce((s, m) => s + m.opponentScore, 0);

  let rsPlayed = 0, rsWins = 0, rsDraws = 0, rsLosses = 0, rsGf = 0, rsGa = 0;
  try {
    rsPlayed = kpiInt(roundStatsKpi, 'Played');
    rsWins = kpiInt(roundStatsKpi, 'Wins');
    rsDraws = kpiInt(roundStatsKpi, 'Draws');
    rsLosses = kpiInt(roundStatsKpi, 'Losses');
    rsGf = kpiInt(roundStatsKpi, 'Goals For');
    rsGa = kpiInt(roundStatsKpi, 'Goals Against');
  } catch (e) {
    problems.push(e instanceof Error ? e.message : String(e));
  }
  if (problems.length === 0 && (sumPlayed !== rsPlayed || sumWins !== rsWins || sumDraws !== rsDraws || sumLosses !== rsLosses || sumGf !== rsGf || sumGa !== rsGa)) {
    problems.push(
      `Parsed matches (${sumPlayed}P ${sumWins}W-${sumDraws}D-${sumLosses}L, ${sumGf}:${sumGa}) don't match the tracker's own Round Stats totals (${rsPlayed}P ${rsWins}W-${rsDraws}D-${rsLosses}L, ${rsGf}:${rsGa}).`
    );
  }

  const statsSumPlayed = statsPlayers.reduce((s, p) => s + p.played, 0);
  const statsSumWins = statsPlayers.reduce((s, p) => s + p.wins, 0);
  const statsSumDraws = statsPlayers.reduce((s, p) => s + p.draws, 0);
  const statsSumLosses = statsPlayers.reduce((s, p) => s + p.losses, 0);
  let atPlayed = 0, atWins = 0, atDraws = 0, atLosses = 0;
  try {
    atPlayed = kpiInt(statsAllTime, 'Played');
    atWins = kpiInt(statsAllTime, 'Wins');
    atDraws = kpiInt(statsAllTime, 'Draws');
    atLosses = kpiInt(statsAllTime, 'Losses');
  } catch (e) {
    problems.push(e instanceof Error ? e.message : String(e));
  }
  if (statsSumPlayed !== atPlayed || statsSumWins !== atWins || statsSumDraws !== atDraws || statsSumLosses !== atLosses) {
    problems.push(
      `Summed per-player stats (${statsSumPlayed}P ${statsSumWins}W-${statsSumDraws}D-${statsSumLosses}L) don't match the tracker's own All Players Contributions total (${atPlayed}P ${atWins}W-${atDraws}D-${atLosses}L).`
    );
  }

  // Every player the tracker has real match stats for must exist by exact
  // name in the squad list, or we don't know who to attach those stats to.
  const squadNames = new Set(squad.map((p) => p.name));
  for (const sp of statsPlayers) {
    if (!squadNames.has(sp.name)) {
      problems.push(`"${sp.name}" appears in Match Stats but not in the Squad list — name mismatch, refusing to guess.`);
    }
  }

  if (problems.length > 0) {
    return { ok: false, problems };
  }

  // --- Merge squad + match-stats + season-form into one player record per
  // person, preserving anything the tracker doesn't publish. --------------
  const existingPlayers = await prisma.player.findMany();
  const existingByUid = new Map(existingPlayers.map((p) => [p.inGameId, p]));

  const OFFICER_POSITION: Record<string, string> = {};
  if (header.president) OFFICER_POSITION[header.president] = 'President';
  if (header.generalSecretary) OFFICER_POSITION[header.generalSecretary] = 'General Secretary';
  if (header.captain) OFFICER_POSITION[header.captain] = 'Captain';
  if (header.viceCaptain) OFFICER_POSITION[header.viceCaptain] = 'Vice-Captain';

  const statsByName = new Map(statsPlayers.map((p) => [p.name, p]));
  const formByName = new Map(seasonForm.map((p) => [p.name, p]));
  const topScorer = [...squad].sort((a, b) => b.allTimeGoals - a.allTimeGoals)[0];

  // Every sync deletes and recreates every Player row (new `id` each time —
  // see the deleteMany/createMany below), so `slug` is what keeps a player's
  // public profile link stable across syncs. Reuse the prior slug whenever
  // the name hasn't changed; only mint a fresh one (deduped within this
  // batch) for new players or an actual rename.
  //
  // Exception: never reuse a prior slug that still contains raw Bengali
  // script. That only happens for a row saved before Bengali names were
  // transliterated to phonetic English (see slugify/transliterateBengaliToEnglish
  // in playerService.ts) — reusing it would keep that old, non-Latin slug
  // around forever even though the name itself hasn't changed. Treating it
  // as "not reusable" makes this self-healing: the very next sync quietly
  // upgrades it to a proper phonetic slug, with no manual admin fix needed.
  const usedSlugs = new Set<string>();
  function slugFor(sq: { name: string; inGameId: string }, prior?: { name: string; slug: string | null }) {
    const priorIsUsable = !!prior?.slug && !containsBengali(prior.slug);
    const reusable = prior && prior.name === sq.name && priorIsUsable ? prior.slug : null;
    const slug = dedupeSlug(reusable ?? slugify(sq.name), usedSlugs);
    usedSlugs.add(slug);
    return slug;
  }

  const playerRows = squad.map((sq) => {
    const prior = existingByUid.get(sq.inGameId);
    const stats = statsByName.get(sq.name);
    const played = stats?.played ?? sq.allTimePlayed;
    const wins = stats?.wins ?? sq.allTimeWins;
    const draws = stats?.draws ?? 0;
    const losses = stats ? stats.losses : Math.max(0, played - wins - draws);
    const goals = sq.allTimeGoals;
    const form = formByName.get(sq.name);

    const bioParts: string[] = [];
    if (sq.name === topScorer?.name && goals > 0) bioParts.push("The club's top scorer.");
    if (OFFICER_POSITION[sq.name]) bioParts.push(`Club ${OFFICER_POSITION[sq.name].toLowerCase()}.`);
    if (played > 0) {
      const winPct = (((wins + draws / 2) / played) * 100).toFixed(1);
      bioParts.push(`${played} played, ${wins}W ${draws}D ${losses}L (${winPct}% win rate), ${goals} goals.`);
    } else {
      bioParts.push('No matches recorded yet.');
    }
    if (sq.device) bioParts.push(`Plays on ${sq.device}.`);
    if (form) {
      const gdStr = form.gd > 0 ? `+${form.gd}` : String(form.gd);
      bioParts.push(`${seasonPhrase}: ${form.played} played, ${form.gf}–${form.ga} (GD ${gdStr}), ${form.winPct.toFixed(1)}% win rate.`);
    }

    return {
      name: sq.name,
      slug: slugFor(sq, prior),
      inGameId: sq.inGameId,
      photoUrl: prior?.photoUrl ?? null,
      joinDate: prior?.joinDate ?? new Date(2025, 0, 1),
      position: OFFICER_POSITION[sq.name] ?? prior?.position ?? 'Squad Member',
      divisionRank: sq.rank ?? 'Unranked',
      goals,
      matchesPlayed: played,
      wins,
      draws,
      losses,
      // "Main #28" — the tracker's own current squad-slot badge. Keep the
      // prior value if this sync couldn't read one (rather than blanking a
      // real value out over a parsing hiccup).
      squadNumber: sq.jersey ? `Main ${sq.jersey}` : (prior?.squadNumber ?? null),
      seasonMatchesPlayed: form?.played ?? null,
      seasonWins: form?.wins ?? null,
      seasonGoalsFor: form?.gf ?? null,
      seasonGoalsAgainst: form?.ga ?? null,
      seasonWinPct: form?.winPct ?? null,
      seasonGoalDiff: form?.gd ?? null,
      squadJson: prior?.squadJson ?? '[]',
      favoritePlayer: prior?.favoritePlayer ?? null,
      favoritePlayerImage: prior?.favoritePlayerImage ?? null,
      bio: bioParts.join(' '),
      featured: (prior?.featured ?? false) || !!OFFICER_POSITION[sq.name] || sq.name === topScorer?.name,
    };
  });

  // --- Club's own official match record (from the parsed Rounds, which we
  // already validated above), used for Standings + the history text. ------
  const officialRecord = { played: sumPlayed, wins: sumWins, draws: sumDraws, losses: sumLosses, gf: sumGf, ga: sumGa };
  const officialWinPct = (((officialRecord.wins + officialRecord.draws / 2) / officialRecord.played) * 100).toFixed(1);
  const cleanSheets = matches.filter((m) => m.opponentScore === 0).length;

  const allTimeRanking = rankings.find((r) => r.scope === 'All-Time');

  function buildClubInfo() {
    const leadershipLine = `The club is led by President ${header.president}, General Secretary ${header.generalSecretary}, Captain ${header.captain}, and Vice-Captain ${header.viceCaptain}, backed by a full ${squad.length}-player squad.`;
    const rankLine = allTimeRanking
      ? `As of the tracker's last ranking snapshot, the club sits at #${allTimeRanking.position} overall (All-Time, ${allTimeRanking.division}) with a club rating of ${allTimeRanking.rating.toFixed(2)}.`
      : '';
    const recordLine = `The club's official match record stands at ${officialRecord.played} played (${officialRecord.wins}W-${officialRecord.draws}D-${officialRecord.losses}L, ${officialWinPct}% win rate, ${officialRecord.gf} goals for, ${officialRecord.ga} against, ${cleanSheets} clean sheet${cleanSheets === 1 ? '' : 's'}).`;
    const aggregatePlayed = kpiInt(statsAllTime, 'Played');
    const aggregateGf = statsAllTime['Goals For'] ?? '';
    const aggregateGa = statsAllTime['Goals Against'] ?? '';
    const aggregateLine = `Across the whole squad's combined personal match history (which includes more than just these ${officialRecord.played} club fixtures) the tracker shows ${aggregatePlayed} played, ${atWins}W-${atDraws}D-${atLosses}L, ${aggregateGf} goals for, ${aggregateGa} against.`;
    const fbLine = header.facebookUrl ? ` Follow the club on Facebook: ${header.facebookUrl}.` : '';

    const history = `${header.clubName} is based in ${header.location}. ${leadershipLine} ${rankLine} ${recordLine} ${aggregateLine}${fbLine} ${header.tagline}`.replace(/\s+/g, ' ').trim();

    const achievements = [
      `Full ${squad.length}-player squad based in ${header.location}`,
      allTimeRanking ? `Ranked #${allTimeRanking.position} overall (All-Time, ${allTimeRanking.division}) — club rating ${allTimeRanking.rating.toFixed(2)}` : undefined,
      rankings.length > 1
        ? `Season ranking: ${rankings
            .filter((r) => r.scope !== 'All-Time')
            .map((r) => `#${r.position} for ${r.scope} (rating ${r.rating.toFixed(2)})`)
            .join(', ')}`
        : undefined,
      `Club's official match record: ${officialRecord.played} played, ${officialRecord.wins}W-${officialRecord.draws}D-${officialRecord.losses}L (${officialWinPct}% win rate), ${officialRecord.gf} goals for, ${officialRecord.ga} against, ${cleanSheets} clean sheet${cleanSheets === 1 ? '' : 's'}`,
      `Whole squad's combined personal match history: ${aggregatePlayed} played, ${atWins}W-${atDraws}D-${atLosses}L, ${aggregateGf} goals for, ${aggregateGa} against`,
      `Leadership: ${header.president} (President), ${header.generalSecretary} (General Secretary), ${header.captain} (Captain), ${header.viceCaptain} (Vice-Captain)`,
      topScorer ? `Top scorer: ${topScorer.name} — ${topScorer.allTimeGoals} goals` : undefined,
    ].filter((x): x is string => !!x);

    return {
      clubName: header.clubName,
      tagline: header.tagline,
      history,
      achievementsJson: JSON.stringify(achievements),
      // Read fresh every sync (see parseSeasonLabel above) rather than
      // assumed, so the player stat card's "Season" toggle label moves
      // forward on its own once the tracker rolls over to a new season.
      currentSeasonLabel: seasonLabel ?? null,
    };
  }

  // --- Write everything, now that every check has passed. ----------------
  // lastSyncedAt is stamped here (not by hand anywhere) so the admin
  // dashboard's "Last synced: X ago" reflects every successful sync —
  // manual button click or the automatic hourly background run alike.
  await prisma.clubInfo.upsert({
    where: { id: 'main' },
    update: { ...buildClubInfo(), lastSyncedAt: new Date() },
    create: { id: 'main', ...buildClubInfo(), lastSyncedAt: new Date() },
  });

  // --- Detect genuinely new results/fixtures since the last sync, so a
  // notification can be raised for site visitors (see the Notification
  // model) without re-notifying about the same match every single sync.
  // Every sync fully replaces the Match table (see deleteMany/createMany
  // right below), so "new" has to be judged against what was there a moment
  // ago, keyed by content — not by row id, which never survives a sync. ----
  const priorMatches = await prisma.match.findMany();
  const priorCompletedKeys = new Set(
    priorMatches
      .filter((m) => m.status === 'COMPLETED')
      .map((m) => `${m.opponent}|${m.date.getTime()}|${m.ourScore}-${m.opponentScore}`)
  );
  const priorUpcomingKeys = new Set(
    priorMatches.filter((m) => m.status === 'UPCOMING').map((m) => `${m.opponent}|${m.date.getTime()}`)
  );

  // The tracker only ever exposes a match's own numeric id while it's still
  // an upcoming fixture (see the Match model's `cobegMatchId` comment), so
  // the only way a COMPLETED match ends up with one is if a previous sync
  // captured it back when it was still UPCOMING. Since every sync replaces
  // the whole Match table, that id has to be carried forward by hand here —
  // looked up by the same opponent+date key used for notifications above.
  const priorMatchIdByKey = new Map(
    priorMatches.filter((m) => m.cobegMatchId != null).map((m) => [`${m.opponent}|${m.date.getTime()}`, m.cobegMatchId])
  );

  await prisma.match.deleteMany({});
  await prisma.match.createMany({
    data: [
      ...matches.map((m) => ({
        opponent: m.opponent,
        date: new Date(m.dateMs),
        ourScore: m.ourScore,
        opponentScore: m.opponentScore,
        status: 'COMPLETED',
        competition: m.competition,
        notes: m.opponentSquad ? `Opponent fielded their ${m.opponentSquad} squad.` : null,
        // Prefer whatever the Rounds tab itself shows right now (freshest,
        // and covers old matches too as long as they're still in its
        // window) — fall back to a previously-known id (auto-captured
        // while upcoming, or pasted in by an admin) for one that's aged out.
        cobegMatchId: m.cobegMatchId ?? priorMatchIdByKey.get(`${m.opponent}|${m.dateMs}`) ?? null,
      })),
      ...fixtures.map((f) => ({
        opponent: f.opponent,
        date: new Date(f.dateMs),
        ourScore: null,
        opponentScore: null,
        status: 'UPCOMING',
        competition: f.round,
        notes: f.opponentSquad ? `Opponent expected to field their ${f.opponentSquad} squad.` : null,
        cobegMatchId: f.cobegMatchId ?? priorMatchIdByKey.get(`${f.opponent}|${f.dateMs}`) ?? null,
      })),
    ],
  });

  // Only the matches/fixtures that weren't already there a moment ago get a
  // notification — a sync that just re-confirms the same 14 results and 9
  // fixtures raises nothing new.
  const newMatchNotifications = matches
    .filter((m) => !priorCompletedKeys.has(`${m.opponent}|${m.dateMs}|${m.ourScore}-${m.opponentScore}`))
    .map((m) => {
      const winner = m.result === 'W' ? header.clubName : m.result === 'L' ? m.opponent : null;
      const body = winner
        ? `The ${m.competition} fixture has been saved, ${m.ourScore}-${m.opponentScore}, with ${winner} finishing ahead.`
        : `The ${m.competition} fixture ended level, ${m.ourScore}-${m.opponentScore} against ${m.opponent}.`;
      return {
        type: 'MATCH_RESULT' as const,
        title: `${header.clubName} result: ${m.ourScore}-${m.opponentScore}`,
        body,
        href: '/matches',
      };
    });

  const newFixtureNotifications = fixtures
    .filter((f) => !priorUpcomingKeys.has(`${f.opponent}|${f.dateMs}`))
    .map((f) => ({
      type: 'UPCOMING_FIXTURE' as const,
      title: `Upcoming fixture: vs ${f.opponent}`,
      body: `${f.round} · ${new Date(f.dateMs).toLocaleDateString('en-US', { dateStyle: 'medium' })}${
        f.opponentSquad ? ` — opponent expected to field their ${f.opponentSquad} squad.` : ''
      }`,
      href: '/matches',
    }));

  await createNotifications([...newMatchNotifications, ...newFixtureNotifications]);
  await pruneOldNotifications();

  await prisma.player.deleteMany({});
  await prisma.player.createMany({ data: playerRows });

  // --- Record one stat snapshot per player whose totals actually changed
  // since their last snapshot — the trend-over-time chart on each profile
  // page fills in from these, sync by sync. Skipping unchanged players
  // keeps this table from filling up with duplicate rows on syncs where
  // nothing new happened for that player. -----------------------------
  const latestSnapshots = await prisma.playerStatSnapshot.findMany({
    orderBy: { takenAt: 'desc' },
    distinct: ['inGameId'],
  });
  const latestByUid = new Map(latestSnapshots.map((s) => [s.inGameId, s]));
  const newSnapshots = playerRows
    .filter((p) => {
      const last = latestByUid.get(p.inGameId);
      if (!last) return true; // first time we've ever seen this player
      return (
        last.matchesPlayed !== p.matchesPlayed ||
        last.wins !== p.wins ||
        last.draws !== p.draws ||
        last.losses !== p.losses ||
        last.goals !== p.goals
      );
    })
    .map((p) => ({
      inGameId: p.inGameId,
      playerName: p.name,
      matchesPlayed: p.matchesPlayed,
      wins: p.wins,
      draws: p.draws,
      losses: p.losses,
      goals: p.goals,
    }));
  if (newSnapshots.length > 0) {
    await prisma.playerStatSnapshot.createMany({ data: newSnapshots });
  }

  const existingStanding = await prisma.standing.findFirst({ where: { isUs: true } });
  const standingData = {
    teamName: header.clubName,
    position: allTimeRanking?.position ?? existingStanding?.position ?? 0,
    points: officialRecord.wins * 3 + officialRecord.draws,
    played: officialRecord.played,
    won: officialRecord.wins,
    drawn: officialRecord.draws,
    lost: officialRecord.losses,
    isUs: true,
  };
  if (existingStanding) {
    await prisma.standing.update({ where: { id: existingStanding.id }, data: standingData });
  } else {
    await prisma.standing.create({ data: standingData });
  }

  // --- Transfers + Rankings: full tables, always fully replaced from the
  // tracker (nothing here is ever admin-edited). ---------------------------
  await prisma.transfer.deleteMany({});
  await prisma.transfer.createMany({
    data: transfers.map((t, i) => ({
      date: new Date(t.date),
      type: t.type,
      player: t.player,
      squad: t.squad,
      fromClub: t.fromClub ?? null,
      order: i,
    })),
  });

  await prisma.rankingSnapshot.deleteMany({});
  await prisma.rankingSnapshot.createMany({
    data: rankings.map((r, i) => ({
      scope: r.scope,
      position: r.position,
      division: r.division,
      rating: r.rating,
      played: r.played,
      wins: r.wins,
      draws: r.draws,
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      winPct: r.winPct,
      order: i,
    })),
  });

  // --- Full match reports: for any COMPLETED match we now have a
  // cobegMatchId for but no cached report yet, fetch and cache its full
  // per-player detail page (see lib/matchReportSync.ts). Deliberately its
  // own try/catch, separate from everything above — a single unreachable or
  // oddly-formatted match report should never fail the entire sync (all the
  // roster/match/standings data above has already been safely written by
  // this point regardless of what happens here). --------------------------
  try {
    await syncMatchReports();
  } catch (err) {
    console.error('Match report sync failed (core sync data was already saved fine):', err);
  }

  return {
    ok: true,
    summary: {
      players: squad.length,
      matches: matches.length,
      fixtures: fixtures.length,
      transfers: transfers.length,
      rankings: rankings.length,
      officialRecord,
    },
  };
}
