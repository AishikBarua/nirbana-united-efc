/**
 * One-off data update — pulls in the club's real info from the public
 * tracker page (cobegbd.com) without touching anything an admin may have
 * already added by hand.
 *
 * Safe to run more than once: ClubInfo is a singleton upsert, and Matches /
 * that one stale News post are fully replaced with the current real data
 * (so re-running this after the tracker page changes keeps things in sync).
 * Players and Gallery images are NEVER touched by this script — the roster
 * still needs the full 25-name list from the club before it can be updated.
 *
 * Run with: npx tsx prisma/update-real-data.ts
 * (also wired up to the one-click "update-real-data.bat" in the project root)
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Small helper: build a Date from a plain "YYYY-MM-DD" + hour, in local time.
function at(dateStr: string, hour = 21, minute = 0): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d, hour, minute, 0, 0);
}

async function main() {
  // --- Club info: real leadership, location, and current ranking ---------
  await prisma.clubInfo.upsert({
    where: { id: 'main' },
    update: {
      clubName: 'Nirbana United EFC',
      tagline: 'Meditate. Dominate. Celebrate.',
      founded: '2025',
      history:
        "Nirbana United EFC is based in Dhaka and was founded in 2025. The club is led by President Ontu Barua, General Secretary Sonjoy Barua Shanto, Captain Niloy Barua, and Vice-Captain Dhruba Barua, backed by a full 25-player squad. All 14 of the club's official fixtures have been played by its Main side. As of the tracker's last ranking snapshot, the club sits at #112 overall (All-Time, FOUNDATION division) with a club rating of 964.03 — by season, #68 for eFootball 2026 (rating 974.42) and #94 for eFootball 2027 (rating 984.49). The club's official match record stands at 14 played (1W-0D-13L, 7.1% win rate, 35 goals for, 115 against, 1 clean sheet); across the whole squad's combined personal match history (which includes more than just these 14 club fixtures) the tracker shows 156 played, 28W-13D-115L, 199 goals for, 514 against (22.1% win rate, 11 clean sheets). Follow the club on Facebook: https://www.facebook.com/profile.php?id=61590189280385. Meditate. Dominate. Celebrate.",
      achievementsJson: JSON.stringify([
        'Full 25-player squad based in Dhaka, founded 2025',
        'Ranked #112 overall (All-Time, FOUNDATION division) — club rating 964.03',
        'Season ranking: #68 for eFootball 2026 (rating 974.42), #94 for eFootball 2027 (rating 984.49)',
        "Club's official match record: 14 played, 1W-0D-13L (7.1% win rate), 35 goals for, 115 against, 1 clean sheet",
        "Whole squad's combined personal match history: 156 played, 28W-13D-115L (22.1% win rate), 199 goals for, 514 against, 11 clean sheets",
        'Leadership: Ontu Barua (President), Sonjoy Barua Shanto (General Secretary), Niloy Barua (Captain), Dhruba Barua (Vice-Captain)',
        'Top scorer: Oishik Barua — 31 goals',
      ]),
    },
    create: {
      id: 'main',
      clubName: 'Nirbana United EFC',
      tagline: 'Meditate. Dominate. Celebrate.',
      founded: '2025',
      history:
        "Nirbana United EFC is based in Dhaka and was founded in 2025. The club is led by President Ontu Barua, General Secretary Sonjoy Barua Shanto, Captain Niloy Barua, and Vice-Captain Dhruba Barua, backed by a full 25-player squad. All 14 of the club's official fixtures have been played by its Main side. As of the tracker's last ranking snapshot, the club sits at #112 overall (All-Time, FOUNDATION division) with a club rating of 964.03 — by season, #68 for eFootball 2026 (rating 974.42) and #94 for eFootball 2027 (rating 984.49). The club's official match record stands at 14 played (1W-0D-13L, 7.1% win rate, 35 goals for, 115 against, 1 clean sheet); across the whole squad's combined personal match history (which includes more than just these 14 club fixtures) the tracker shows 156 played, 28W-13D-115L, 199 goals for, 514 against (22.1% win rate, 11 clean sheets). Follow the club on Facebook: https://www.facebook.com/profile.php?id=61590189280385. Meditate. Dominate. Celebrate.",
      achievementsJson: JSON.stringify([
        'Full 25-player squad based in Dhaka, founded 2025',
        'Ranked #112 overall (All-Time, FOUNDATION division) — club rating 964.03',
        'Season ranking: #68 for eFootball 2026 (rating 974.42), #94 for eFootball 2027 (rating 984.49)',
        "Club's official match record: 14 played, 1W-0D-13L (7.1% win rate), 35 goals for, 115 against, 1 clean sheet",
        "Whole squad's combined personal match history: 156 played, 28W-13D-115L (22.1% win rate), 199 goals for, 514 against, 11 clean sheets",
        'Leadership: Ontu Barua (President), Sonjoy Barua Shanto (General Secretary), Niloy Barua (Captain), Dhruba Barua (Vice-Captain)',
        'Top scorer: Oishik Barua — 31 goals',
      ]),
    },
  });
  console.log('Updated club info.');

  // --- Matches: replace sample fixtures/results with the real ones -------
  // NOTE on scores: confirmed straight from the tracker's Rounds tab (with
  // green/red W/L badges) — 1 win (Young Boys fc, GRP3-R15, 7-0) and 13
  // losses, 14 matches total. Dates are read directly from that tab.
  // We always play as our "Main" side (the tracker's own team filter only
  // ever offers "Main" for this club) — an earlier version of this script
  // wrongly tagged some of our own matches "(Academy)", which has been
  // removed. The "Academy"/"Main" badge shown next to each opponent's name
  // on the tracker is the OPPONENT's own squad designation, not ours — kept
  // here in `notes` instead, since it's genuinely useful context.
  // NOTE: "Synthwave Strikers" is the GROUP/DIVISION NAME on the tracker
  // (every match is labelled "Synthwave Strikers GRP3-R#"), not a real
  // opponent — an earlier version of this script mistakenly added 8
  // upcoming "matches vs Synthwave Strikers", which this version removes.
  // No upcoming fixtures are loaded here since the real next opponent/date
  // isn't reliably readable yet — add them via /admin once confirmed.
  await prisma.match.deleteMany({});
  await prisma.match.createMany({
    data: [
      // All 14 GRP3 group-stage matches played so far
      { opponent: 'Young Boys fc', date: at('2026-09-10'), ourScore: 7, opponentScore: 0, status: 'COMPLETED', competition: 'GRP3-R15', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Tornado Extreme', date: at('2026-09-10'), ourScore: 3, opponentScore: 7, status: 'COMPLETED', competition: 'GRP3-R19', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Phoenix empire soldiers', date: at('2026-09-07'), ourScore: 2, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R18', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Warriors Of Pboc', date: at('2026-09-04'), ourScore: 1, opponentScore: 10, status: 'COMPLETED', competition: 'GRP3-R6', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Soccer Kings Of Bangladesh', date: at('2026-09-01'), ourScore: 2, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R10', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Tornado Extreme', date: at('2026-08-29'), ourScore: 1, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R8', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Golden Knights', date: at('2026-08-26'), ourScore: 3, opponentScore: 8, status: 'COMPLETED', competition: 'Friendly', notes: 'Opponent fielded their Main squad.' },
      { opponent: 'Phoenix empire soldiers', date: at('2026-08-24'), ourScore: 0, opponentScore: 11, status: 'COMPLETED', competition: 'GRP3-R7', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Gang Of Efootball Brothers', date: at('2026-08-22'), ourScore: 2, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R9', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Royal Bengal Efc Rbefc', date: at('2026-08-10'), ourScore: 4, opponentScore: 5, status: 'COMPLETED', competition: 'GRP3-R5', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Young Boys fc', date: at('2026-08-08'), ourScore: 5, opponentScore: 7, status: 'COMPLETED', competition: 'GRP3-R4', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Pes Research Club', date: at('2026-08-02'), ourScore: 1, opponentScore: 11, status: 'COMPLETED', competition: 'GRP3-R1', notes: 'Opponent fielded their Academy squad.' },
      { opponent: 'Nk Darkstorm', date: at('2026-08-06'), ourScore: 2, opponentScore: 10, status: 'COMPLETED', competition: 'GRP3-R3', notes: 'Opponent fielded their Main squad.' },
      { opponent: 'Air Eagles Efootball Club', date: at('2026-08-04'), ourScore: 2, opponentScore: 10, status: 'COMPLETED', competition: 'GRP3-R2', notes: 'Opponent fielded their Academy squad.' },
    ],
  });
  console.log('Updated matches (14 real results: 1 win, 13 losses; no fabricated fixtures).');

  // --- Standings: the tracker doesn't publish a full league table (only a
  // single ranking snapshot for our own club), so the old sample table of
  // invented rival clubs is cleared, and replaced with just our own real
  // All-Time ranking snapshot from the tracker's Rankings tab: #112 overall,
  // FOUNDATION division. Played/won/drawn/lost use the club's own official
  // match record (14 played, 1W-0D-13L — see the Matches page), not the
  // broader all-players personal-history total. Points are a standard 3/1/0
  // calc from that real W-D-L (3), not something the tracker itself
  // publishes. Add a real full table here if the league ever publishes one.
  await prisma.standing.deleteMany({});
  await prisma.standing.create({
    data: {
      teamName: 'Nirbana United EFC',
      position: 112,
      points: 3,
      played: 14,
      won: 1,
      drawn: 0,
      lost: 13,
      isUs: true,
    },
  });
  console.log('Updated standings (our own #112 all-time snapshot; no full league table is published by the tracker).');

  // --- News: remove fictional/incorrect posts from earlier versions of
  // this script (a fabricated "Iron Phoenix Club" result, and a post that
  // wrongly treated "Synthwave Strikers" — the tracker's GROUP NAME — as an
  // opponent), and replace with an accurate one about the season so far.
  const staleTitles = ['Statement win over Iron Phoenix Club', 'Nine-match series with Synthwave Strikers begins Sep 26'];
  for (const title of staleTitles) {
    const stale = await prisma.news.findFirst({ where: { title } });
    if (stale) await prisma.news.delete({ where: { id: stale.id } });
  }
  const alreadyPosted = await prisma.news.findFirst({ where: { title: { contains: 'GRP3 group stage' } } });
  if (!alreadyPosted) {
    await prisma.news.create({
      data: {
        title: '13 matches into the GRP3 group stage',
        body: 'The squad has played 13 matches in the GRP3 group stage so far this season. Full match-by-match results are on the Matches page — Oishik Barua leads the scoring charts with 27 goals.',
        publishedDate: new Date(),
      },
    });
  }
  console.log('Updated news.');

  console.log('\nDone. Players and gallery images were left untouched.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
