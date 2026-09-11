/**
 * One-off data update — loads the club's real, COMPLETE 25-player roster,
 * merged from THREE tracker screenshots the club sent in over time:
 *  - "Match Stats / All Players Contributions" — win/draw/loss breakdowns
 *  - "Squad" screen — real in-game UIDs, devices, and goals-for
 *  - "Squad Player Form Details" + the squad grid's blue "#" badges —
 *    each player's tracker rank number and last-5-match "form" stats
 *
 * All 25 squad members are covered — no placeholders left. Per-player exact
 * football position, real join date, and photo still aren't published by
 * the tracker, so those stay as sensible defaults below — edit any of them
 * for a specific player any time from /admin -> Manage Players. The 3
 * players with no tracker rank badge (Apurba Barua, Soumen Shoummo,
 * "Unknown") genuinely show no rank on the tracker (zero matches played),
 * so they're left "Unranked" — that's accurate, not a gap.
 *
 * Safe to run more than once: it fully replaces the Player table each time,
 * so if you edited a player's details by hand in /admin and then re-run
 * this script, those hand-edits (other than a photo — see below) will be
 * overwritten back to the values below. Re-run only when you have fresher
 * tracker numbers to bring in. Photos uploaded via /admin ARE preserved
 * across re-runs (matched by in-game UID), since the tracker doesn't
 * publish photos and a re-run shouldn't erase one you added by hand.
 *
 * Run with: npx tsx prisma/update-roster.ts
 * (also wired up to the one-click "update-roster.bat" in the project root)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const FOUNDING_DATE = new Date(2025, 0, 1);

type RecentForm = { pl: number; w: number; gf: number; ga: number; gd: number; winPct: number };

type RealPlayer = {
  name: string;
  inGameId: string;
  device?: string;
  position: string;
  matchesPlayed: number;
  wins: number;
  draws: number;
  goals: number;
  rank?: string;
  form?: RecentForm;
  featured?: boolean;
  bioExtra?: string;
  reserved?: boolean;
};

function bioFor(p: RealPlayer): string {
  if (p.reserved) {
    return 'Reserved squad slot — not yet active in matches.';
  }
  const parts: string[] = [];
  if (p.bioExtra) parts.push(p.bioExtra);
  if (p.matchesPlayed > 0) {
    const losses = p.matchesPlayed - p.wins - p.draws;
    const winPct = (((p.wins + p.draws / 2) / p.matchesPlayed) * 100).toFixed(1);
    parts.push(`${p.matchesPlayed} played, ${p.wins}W ${p.draws}D ${losses}L (${winPct}% win rate), ${p.goals} goals.`);
  } else {
    parts.push('No matches recorded yet.');
  }
  if (p.device) parts.push(`Plays on ${p.device}.`);
  if (p.form) {
    const gdStr = p.form.gd > 0 ? `+${p.form.gd}` : String(p.form.gd);
    parts.push(
      `eFootball 2026 season: ${p.form.pl} played, ${p.form.gf}–${p.form.ga} (GD ${gdStr}), ${p.form.winPct.toFixed(1)}% win rate.`
    );
  }
  return parts.join(' ');
}

// Full 25-player squad, merged from the club's tracker screenshots.
// Updated 2026-09-11: matches/wins/draws now come from the tracker's live
// "Match Stats -> All Players Contributions" table (which includes the
// just-played GRP3-R19 match), cross-checked to add up exactly to the
// tracker's own All-Time squad totals (156 played, 28W-13D-115L, 199 goals).
// Goals are each player's prior tracker goal tally plus their individual
// GRP3-R19 contribution (from the "Team-up" tab) for anyone who played that
// round, since the Squad screen's goal counter itself lags one match behind.
const realPlayers: RealPlayer[] = [
  { name: 'Oishik Barua', inGameId: 'ASAA-689-482-085', device: 'iPhone 11', position: 'Top Scorer', matchesPlayed: 12, wins: 8, draws: 1, goals: 31, rank: '#7106', form: { pl: 5, w: 4, gf: 16, ga: 4, gd: 12, winPct: 80.0 }, featured: true, bioExtra: "The club's top scorer." },
  { name: 'Pushan Barua', inGameId: 'ASDM-468-522-031', device: 'iPhone 16 Pro Max', position: 'Squad Member', matchesPlayed: 13, wins: 2, draws: 3, goals: 19, rank: '#25819', form: { pl: 5, w: 1, gf: 8, ga: 14, gd: -6, winPct: 30.0 } },
  { name: 'Arnab Barua', inGameId: '943588244', device: 'Redmi 11 Prime', position: 'Squad Member', matchesPlayed: 12, wins: 1, draws: 0, goals: 17, rank: '#27624', form: { pl: 5, w: 1, gf: 11, ga: 27, gd: -16, winPct: 20.0 } },
  { name: 'Joy Barua Kawshik', inGameId: 'ASPZ-666-185-134', device: 'Redmi Note 11', position: 'Squad Member', matchesPlayed: 10, wins: 1, draws: 0, goals: 15, rank: '#27624', form: { pl: 5, w: 1, gf: 13, ga: 26, gd: -13, winPct: 20.0 } },
  { name: 'Srabon Barua', inGameId: '178672266', device: 'Redmi 12', position: 'Squad Member', matchesPlayed: 9, wins: 4, draws: 1, goals: 12, rank: '#10744', form: { pl: 2, w: 2, gf: 5, ga: 0, gd: 5, winPct: 100.0 } },
  { name: 'Piyas Barua', inGameId: 'ASAA-917-187-842', device: 'Realme 11 Pro 5G', position: 'Squad Member', matchesPlayed: 10, wins: 1, draws: 1, goals: 8, rank: '#26489', form: { pl: 5, w: 1, gf: 5, ga: 17, gd: -12, winPct: 20.0 } },
  { name: 'Niloy Barua', inGameId: 'ASNV-825-921-038', device: 'Realme C33', position: 'Captain', matchesPlayed: 9, wins: 2, draws: 0, goals: 9, rank: '#25363', form: { pl: 4, w: 2, gf: 6, ga: 12, gd: -6, winPct: 50.0 }, featured: true, bioExtra: 'Club captain.' },
  { name: 'Pranta Priyo', inGameId: 'ASCW-734-641-902', device: 'Vivo V30 Pro', position: 'Squad Member', matchesPlayed: 8, wins: 0, draws: 0, goals: 6, rank: '#27444', form: { pl: 5, w: 0, gf: 5, ga: 17, gd: -12, winPct: 0.0 } },
  { name: 'Aditto Barua', inGameId: 'ASNG-672-209-834', device: 'Samsung Galaxy A14 5G', position: 'Squad Member', matchesPlayed: 8, wins: 0, draws: 0, goals: 6, rank: '#27691', form: { pl: 5, w: 0, gf: 5, ga: 21, gd: -16, winPct: 0.0 } },
  { name: 'Ayon Barua', inGameId: 'ASAA-762-476-098', device: 'Galaxy S24 Ultra', position: 'Squad Member', matchesPlayed: 8, wins: 4, draws: 1, goals: 14, rank: '#12335', form: { pl: 1, w: 0, gf: 2, ga: 2, gd: 0, winPct: 50.0 } },
  { name: 'Dhruba Barua', inGameId: 'ASAA-764-711-166', device: 'Realme C17', position: 'Vice-Captain', matchesPlayed: 8, wins: 2, draws: 0, goals: 14, rank: '#23520', form: { pl: 1, w: 1, gf: 3, ga: 1, gd: 2, winPct: 100.0 }, featured: true, bioExtra: 'Club vice-captain.' },
  { name: 'Ananta Barua', inGameId: 'ASNQ-172-912-942', device: 'iPhone 12 Pro Max', position: 'Squad Member', matchesPlayed: 6, wins: 1, draws: 0, goals: 4, rank: '#25472', form: { pl: 4, w: 1, gf: 4, ga: 11, gd: -7, winPct: 25.0 } },
  { name: 'Arko Barua', inGameId: 'ASKN-777-675-247', device: 'iQOO Z9x 5G', position: 'Squad Member', matchesPlayed: 7, wins: 0, draws: 1, goals: 6, rank: '#25993', form: { pl: 2, w: 0, gf: 1, ga: 3, gd: -2, winPct: 25.0 } },
  { name: 'Suraj Chowdhury', inGameId: 'ASMD-692-691-818', device: 'Redmi Note 13 Pro+ 5G', position: 'Squad Member', matchesPlayed: 7, wins: 0, draws: 1, goals: 7, rank: '#26255' },
  { name: 'Sonjoy Barua Shanto', inGameId: 'AEZ-206-145-999', device: 'iPhone XR', position: 'General Secretary', matchesPlayed: 6, wins: 0, draws: 0, goals: 7, rank: '#26399', form: { pl: 5, w: 0, gf: 7, ga: 17, gd: -10, winPct: 0.0 }, featured: true, bioExtra: 'Club general secretary.' },
  { name: 'Supan Barua', inGameId: 'ASMC-703-949-835', device: 'OnePlus Nord CE4', position: 'Squad Member', matchesPlayed: 6, wins: 1, draws: 4, goals: 13, rank: '#10744' },
  { name: 'Ontu Barua', inGameId: 'ASAA-598-700-993', device: 'Redmi K20 Pro', position: 'President', matchesPlayed: 5, wins: 0, draws: 0, goals: 3, rank: '#25900', form: { pl: 3, w: 0, gf: 1, ga: 6, gd: -5, winPct: 0.0 }, featured: true, bioExtra: 'Club president.' },
  { name: 'Swapnil Raj', inGameId: 'ASLV-701-978-602', device: 'Redmi Note 13 5G', position: 'Squad Member', matchesPlayed: 5, wins: 0, draws: 0, goals: 2, rank: '#26399' },
  { name: 'সৌরভ', inGameId: 'ASBB-032-245-287', device: 'iPhone 13', position: 'Squad Member', matchesPlayed: 2, wins: 0, draws: 0, goals: 1, rank: '#22002', form: { pl: 2, w: 0, gf: 1, ga: 6, gd: -5, winPct: 0.0 } },
  { name: 'Niloy Barua (II)', inGameId: 'ASCW-248-816-811', device: 'Realme GT Neo 2', position: 'Squad Member', matchesPlayed: 2, wins: 0, draws: 0, goals: 0, rank: '#23712' },
  { name: 'Arnob Barua', inGameId: 'ASDC-174-299-050', device: 'Samsung A03', position: 'Squad Member', matchesPlayed: 1, wins: 0, draws: 0, goals: 1, rank: '#19559', form: { pl: 1, w: 0, gf: 1, ga: 5, gd: -4, winPct: 0.0 } },
  { name: 'Badhan Barua', inGameId: 'ASHT-403-111-951', device: 'Honor 200', position: 'Squad Member', matchesPlayed: 1, wins: 0, draws: 0, goals: 0, rank: '#18835' },
  { name: 'Apurba Barua', inGameId: '063221295', device: 'Honor Play 10', position: 'Squad Member', matchesPlayed: 0, wins: 0, draws: 0, goals: 0, reserved: true },
  { name: 'Soumen Shoummo', inGameId: 'ASAA-785-140-363', device: 'Redmi Note 8 Pro', position: 'Squad Member', matchesPlayed: 1, wins: 1, draws: 0, goals: 4 },
  { name: 'Unknown', inGameId: 'ASNV-712-548-775', device: 'Poco X3 NFC', position: 'Squad Member', matchesPlayed: 0, wins: 0, draws: 0, goals: 0, bioExtra: "This member hasn't set a display name on the tracker yet." },
];

async function main() {
  // Preserve any photo an admin uploaded by hand (matched by in-game UID),
  // since the tracker itself never publishes photos and a data refresh
  // shouldn't erase one that was already added.
  const existing = await prisma.player.findMany({ select: { inGameId: true, photoUrl: true } });
  const photoByUid = new Map(existing.filter((p) => p.photoUrl).map((p) => [p.inGameId, p.photoUrl]));

  await prisma.player.deleteMany({});
  await prisma.player.createMany({
    data: realPlayers.map((p) => {
      const losses = Math.max(0, p.matchesPlayed - p.wins - p.draws);
      return {
        name: p.name,
        inGameId: p.inGameId,
        photoUrl: photoByUid.get(p.inGameId) ?? null,
        joinDate: FOUNDING_DATE,
        position: p.position,
        divisionRank: p.rank ?? 'Unranked',
        goals: p.goals,
        matchesPlayed: p.matchesPlayed,
        wins: p.wins,
        draws: p.draws,
        losses,
        squadJson: '[]',
        favoritePlayer: null,
        favoritePlayerImage: null,
        bio: bioFor(p),
        featured: p.featured ?? false,
      };
    }),
  });
  console.log(`Loaded all ${realPlayers.length} squad members — the full roster is now complete.`);
  console.log('\nExact football position, real join date, and photo (where none was');
  console.log('already uploaded) are placeholders per player -- edit any player in');
  console.log('/admin to fill those in for real.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
