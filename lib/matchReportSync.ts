/**
 * Full individual match reports, scraped from a single match's own page on
 * the club's tracker (cobegbd.com) — e.g. https://cobegbd.com/match/?id=59092.
 * This is a separate concern from trackerSync.ts (which reads the CLUB's
 * page — roster, results list, fixtures, transfers, rankings): this file
 * reads one MATCH's own page, which shows things the club page never does —
 * a full 1-vs-1 stat breakdown for every player on both sides, aggregate
 * team stats, and the Man of the Match.
 *
 * Why this only covers SOME matches: the tracker only ever links to a
 * match's own report page from the club's Fixtures tab, while that match is
 * still upcoming — once it's played and moves into the completed-results
 * list, the club page stops linking to it (confirmed by inspecting both
 * tabs' live markup directly). trackerSync.ts captures that id the moment a
 * fixture appears (see its `cobegMatchId` handling) and carries it forward
 * once the match completes. A match whose fixture was never seen while
 * still upcoming (i.e. anything from before this feature existed) simply
 * has no id and never gets a report — there is no reliable way to recover
 * one after the fact.
 *
 * A handful of small string-extraction helpers below are intentionally
 * duplicated from trackerSync.ts rather than imported from it — they're
 * tiny, generic, and unlikely to ever change, and duplicating them keeps
 * this file (which touches a completely different page/layout on the
 * tracker) from creating any risk of accidentally changing trackerSync.ts's
 * own already-working behavior.
 */
import { prisma } from './db';

const CLUB_ID = '250918042901790';

const BROWSER_LIKE_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9',
};

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

function splitChunks(html: string, startNeedle: string): string[] {
  const parts = html.split(startNeedle);
  return parts.slice(1);
}

// ---------------------------------------------------------------------------
// Shape stored in MatchReport.dataJson
// ---------------------------------------------------------------------------

export type StatRow = {
  label: string;
  homeValue: string;
  awayValue: string;
  homeWins: boolean;
  awayWins: boolean;
};

export type PlayerCard = {
  homePlayerName: string;
  homePlayerRank?: string;
  awayPlayerName: string;
  awayPlayerRank?: string;
  homeScore: number;
  awayScore: number;
  isFeatured: boolean; // the tracker's own "is-gold" highlight (typically the MOTM's card)
  stats: StatRow[];
};

export type MatchReportData = {
  sourceUrl: string;
  fetchedAt: string;
  tournament: string;
  tournamentUrl?: string;
  round: string;
  dateText: string;
  homeTeam: { name: string; clubId: string; crest?: string };
  awayTeam: { name: string; clubId: string; crest?: string };
  homeScore: number;
  awayScore: number;
  status: string;
  isUsHome: boolean;
  aggregateStats: StatRow[];
  playerCards: PlayerCard[];
  manOfTheMatch: { name: string; resultText: string } | null;
};

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

/** Parses every `.sofa-stat-row` in a bounded slice of HTML — used for both
 * a single player-pair's card and the match's own aggregate team totals,
 * since the tracker reuses the exact same row markup for both. */
function parseStatRows(block: string): StatRow[] {
  const re =
    /<span class="sofa-val left([^"]*)">([^<]*)<\/span>\s*<span class="sofa-label">([^<]+)<\/span>\s*<span class="sofa-val right([^"]*)">([^<]*)<\/span>/g;
  const rows: StatRow[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(block))) {
    rows.push({
      label: decodeEntities(m[3]),
      homeValue: m[2].trim(),
      awayValue: m[5].trim(),
      homeWins: /winner/.test(m[1]),
      awayWins: /winner/.test(m[4]),
    });
  }
  return rows;
}

function parseHeader(html: string): {
  tournament: string;
  tournamentUrl?: string;
  round: string;
  dateText: string;
  homeTeam: { name: string; clubId: string; crest?: string };
  awayTeam: { name: string; clubId: string; crest?: string };
  homeScore: number;
  awayScore: number;
  status: string;
} {
  const startIdx = html.indexOf('prem-header-wrapper');
  const endIdx = html.indexOf('ovromatch-tabs-nav', startIdx);
  if (startIdx === -1 || endIdx === -1) {
    throw new Error('Could not find the match report header — the tracker\'s page layout may have changed.');
  }
  const header = html.slice(startIdx, endIdx);

  const tournament = decodeEntities(firstMatch(header, /class="prem-tour-link">\s*([^<]+?)\s*<\/a>/) ?? '');
  const tournamentUrl = firstMatch(header, /<a href="([^"]+)" class="prem-tour-link">/);
  const round = decodeEntities(firstMatch(header, /prem-top-sep">\|<\/span>\s*<span>([^<]+)<\/span>/) ?? '');
  const dateText = decodeEntities(firstMatch(header, /prem-top-right">([^<]+)<\/div>/) ?? '');

  const teamRe = /<a href="([^"]+)" class="prem-team">([\s\S]*?)<\/a>/g;
  const teams: { name: string; clubId: string; crest?: string }[] = [];
  let tm: RegExpExecArray | null;
  while ((tm = teamRe.exec(header))) {
    const href = tm[1];
    const block = tm[2];
    const clubIdMatch = /id=([^&"]+)/.exec(href);
    teams.push({
      clubId: clubIdMatch ? clubIdMatch[1] : '',
      name: decodeEntities(firstMatch(block, /prem-name">([^<]+)<\/div>/) ?? ''),
      crest: firstMatch(block, /data-src="([^"]+)"/),
    });
  }
  if (teams.length !== 2) {
    throw new Error(`Expected exactly 2 teams in the match report header, found ${teams.length}.`);
  }

  const scoreText = firstMatch(header, /prem-huge-score">([^<]+)<\/div>/) ?? '';
  const [homeScoreStr, awayScoreStr] = scoreText.split('-').map((s) => s.trim());
  const status = decodeEntities(firstMatch(header, /prem-date">([^<]+)<\/div>/) ?? '');

  return {
    tournament,
    tournamentUrl,
    round: round || 'Match',
    dateText,
    homeTeam: teams[0],
    awayTeam: teams[1],
    homeScore: parseInt(homeScoreStr, 10),
    awayScore: parseInt(awayScoreStr, 10),
    status,
  };
}

function parsePlayerCards(html: string): PlayerCard[] {
  // Bound the search to the player-comparison panel only, ending right
  // before the (unrelated) "download a shareable card image" dialog that
  // follows it in the markup — that dialog re-renders its own copy of a
  // player-card-shaped preview, which would otherwise risk being picked up
  // as extra, bogus chunks.
  const startIdx = html.indexOf('cobeg-match-page');
  const endIdx = html.indexOf('screenshot-dialog', startIdx);
  if (startIdx === -1) return []; // page layout changed too much to trust — return nothing rather than guess
  const scoped = endIdx === -1 ? html.slice(startIdx) : html.slice(startIdx, endIdx);

  const chunks = splitChunks(scoped, '<div class="match-card');
  const cards: PlayerCard[] = [];
  for (const chunk of chunks) {
    const isFeatured = chunk.slice(0, 20).includes('is-gold');

    // Not every pairing gets a full stat breakdown — a bench player with
    // negligible minutes only gets a name + score, no `.match-body` at all.
    // So each field below is extracted directly off the whole chunk (bounded
    // to exactly this one card by the split above) rather than via a
    // "block" sub-string first — that way a card missing some later section
    // still yields whatever it does have instead of being skipped entirely.
    const homePlayerRank = firstMatch(chunk, /player-rank">([^<]+)</);
    const homePlayerName = decodeEntities(
      firstMatch(chunk, /<div class="pname">([^<]+)<\/div><\/div><div class="match-score-text">/) ?? ''
    );
    const scoreBlock =
      firstMatch(chunk, /<div class="match-score-text">([\s\S]*?)<\/div><div class="player-side p-right">/) ?? '';
    const scoreNums = [...scoreBlock.matchAll(/<span>(\d+)<\/span>/g)].map((m) => parseInt(m[1], 10));
    const awayPlayerName = decodeEntities(
      firstMatch(chunk, /<div class="player-side p-right"><div class="pname">([^<]+)<\/div>/) ?? ''
    );
    if (!homePlayerName || !awayPlayerName) continue; // can't reliably tell who's playing whom — skip rather than guess

    cards.push({
      homePlayerName,
      homePlayerRank,
      awayPlayerName,
      awayPlayerRank: undefined, // the tracker only ever shows this badge on the home side of a card
      homeScore: scoreNums[0] ?? 0,
      awayScore: scoreNums[1] ?? 0,
      isFeatured,
      stats: parseStatRows(chunk), // empty for a bench pairing with no `.match-body` — that's correct, not a bug
    });
  }
  return cards;
}

function parseAggregateStats(html: string): StatRow[] {
  const startIdx = html.indexOf('pro-stats-container');
  if (startIdx === -1) return [];
  const endIdx = html.indexOf('motm-wrap', startIdx);
  const block = endIdx === -1 ? html.slice(startIdx, startIdx + 12000) : html.slice(startIdx, endIdx);
  return parseStatRows(block);
}

function parseManOfTheMatch(html: string): { name: string; resultText: string } | null {
  const startIdx = html.indexOf('motm-wrap');
  if (startIdx === -1) return null;
  const endIdx = html.indexOf('tab-standing-wrap', startIdx);
  const block = endIdx === -1 ? html.slice(startIdx, startIdx + 8000) : html.slice(startIdx, endIdx);

  const name = decodeEntities(firstMatch(block, /motm-player-name"[^>]*>([^<]+)</) ?? '');
  const resultRaw = firstMatch(block, /motm-match-result">([\s\S]*?)<\/div>/) ?? '';
  const resultText = decodeEntities(resultRaw.replace(/<\/?b>/g, ''));
  if (!name) return null;
  return { name, resultText };
}

export function parseMatchReport(html: string, sourceUrl: string): MatchReportData {
  const header = parseHeader(html);
  const isHomeUs = header.homeTeam.clubId === CLUB_ID;
  const isAwayUs = header.awayTeam.clubId === CLUB_ID;
  if (!isHomeUs && !isAwayUs) {
    throw new Error(
      `Neither team on this match report (${header.homeTeam.name} vs ${header.awayTeam.name}) is our own club — refusing to save a match report that isn't ours.`
    );
  }

  return {
    sourceUrl,
    fetchedAt: new Date().toISOString(),
    tournament: header.tournament,
    tournamentUrl: header.tournamentUrl,
    round: header.round,
    dateText: header.dateText,
    homeTeam: header.homeTeam,
    awayTeam: header.awayTeam,
    homeScore: header.homeScore,
    awayScore: header.awayScore,
    status: header.status,
    isUsHome: isHomeUs,
    aggregateStats: parseAggregateStats(html),
    playerCards: parsePlayerCards(html),
    manOfTheMatch: parseManOfTheMatch(html),
  };
}

export async function fetchMatchReport(cobegMatchId: number): Promise<MatchReportData> {
  const url = `https://cobegbd.com/match/?id=${cobegMatchId}`;
  const res = await fetch(url, { headers: BROWSER_LIKE_HEADERS, cache: 'no-store' });
  if (!res.ok) throw new Error(`Fetching match report ${cobegMatchId} failed: HTTP ${res.status}`);
  const html = await res.text();
  return parseMatchReport(html, url);
}

/** Fetches and caches a full match report for every COMPLETED match that
 * has a cobegMatchId but no cached report yet. Called at the end of every
 * tracker sync (see trackerSync.ts) — in practice this is 0 or 1 matches
 * per sync (one match roughly per round), never a bulk backfill. A report,
 * once cached, is never re-fetched — a finished match's stats don't change
 * on the tracker afterwards. */
export async function syncMatchReports(): Promise<void> {
  const completedWithId = await prisma.match.findMany({
    where: { status: 'COMPLETED', cobegMatchId: { not: null } },
    select: { cobegMatchId: true },
  });
  const ids = Array.from(new Set(completedWithId.map((m) => m.cobegMatchId as number)));
  if (ids.length === 0) return;

  const cached = await prisma.matchReport.findMany({
    where: { cobegMatchId: { in: ids } },
    select: { cobegMatchId: true },
  });
  const cachedIds = new Set(cached.map((r) => r.cobegMatchId));
  const missing = ids.filter((id) => !cachedIds.has(id));
  if (missing.length === 0) return;

  for (const id of missing) {
    try {
      const data = await fetchMatchReport(id);
      await prisma.matchReport.upsert({
        where: { cobegMatchId: id },
        update: { dataJson: JSON.stringify(data), fetchedAt: new Date() },
        create: { cobegMatchId: id, dataJson: JSON.stringify(data) },
      });
    } catch (err) {
      // Skip this one match's report — it'll simply be retried on the next
      // sync, since it's still "missing" from MatchReport until it succeeds.
      console.error(`Could not fetch/save match report for cobegMatchId=${id}:`, err);
    }
    await new Promise((resolve) => setTimeout(resolve, 400)); // a short, polite pause between requests
  }
}
