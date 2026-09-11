/**
 * Seed script — populates the database with sample Nirbana United EFC data
 * and creates the first admin account, so the site is never empty on first run.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // --- Admin account -------------------------------------------------
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nirbanaunited.club';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({ data: { email: adminEmail, passwordHash } });
    console.log(`Created admin account: ${adminEmail} (password from .env — change it after first login)`);
  } else {
    console.log(`Admin account already exists: ${adminEmail}`);
  }

  // --- Club info -------------------------------------------------------
  // Real details, pulled from the club's public tracker page (cobegbd.com).
  await prisma.clubInfo.upsert({
    where: { id: 'main' },
    update: {},
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

  // --- Players ---------------------------------------------------------
  // NOTE: these are still PLACEHOLDER players, not the real squad. Run
  // prisma/update-roster.ts (double-click update-roster.bat) after this to
  // load the real 22-of-25 roster the club sent in, with real match stats.
  const players = [
    {
      name: 'Aishik Rahman',
      inGameId: 'aishik_nu',
      position: 'Captain / Attacking Mid',
      divisionRank: 'Elite Division',
      goals: 58,
      matchesPlayed: 64,
      wins: 41,
      draws: 10,
      losses: 13,
      squadJson: JSON.stringify(['Messi', 'Bellingham', 'Vinicius Jr.', 'Rodri', 'Van Dijk']),
      favoritePlayer: 'Messi',
      bio: 'Founder and captain. Sets the tempo from midfield and never plays a match half-focused.',
      featured: true,
      joinDaysAgo: 400,
    },
    {
      name: 'Tanvir Hasan',
      inGameId: 'tanvir.7',
      position: 'Striker',
      divisionRank: 'Elite Division',
      goals: 71,
      matchesPlayed: 60,
      wins: 38,
      draws: 9,
      losses: 13,
      squadJson: JSON.stringify(['Mbappe', 'Haaland', 'De Bruyne', 'Alaba']),
      favoritePlayer: 'Haaland',
      bio: 'Clinical finisher, top scorer for three seasons running.',
      featured: true,
      joinDaysAgo: 380,
    },
    {
      name: 'Rifat Chowdhury',
      inGameId: 'rifat_efc',
      position: 'Goalkeeper',
      divisionRank: 'Division 1',
      goals: 0,
      matchesPlayed: 55,
      wins: 33,
      draws: 8,
      losses: 14,
      squadJson: JSON.stringify(['Courtois', 'Van Dijk', 'Alaba', 'Kimmich']),
      favoritePlayer: 'Courtois',
      bio: 'Wall between the posts — best save rate in the club.',
      featured: true,
      joinDaysAgo: 360,
    },
    {
      name: 'Shanto Islam',
      inGameId: 'shanto10',
      position: 'Winger',
      divisionRank: 'Division 1',
      goals: 44,
      matchesPlayed: 52,
      wins: 30,
      draws: 7,
      losses: 15,
      squadJson: JSON.stringify(['Vinicius Jr.', 'Salah', 'Neymar Jr.']),
      favoritePlayer: 'Vinicius Jr.',
      bio: 'Pace on the flank, the assist king.',
      featured: false,
      joinDaysAgo: 340,
    },
    {
      name: 'Mahin Chowdhury',
      inGameId: 'mahin_c',
      position: 'Center Back',
      divisionRank: 'Division 1',
      goals: 3,
      matchesPlayed: 50,
      wins: 29,
      draws: 8,
      losses: 13,
      squadJson: JSON.stringify(['Van Dijk', 'Rudiger', 'Marquinhos']),
      favoritePlayer: 'Van Dijk',
      bio: 'Reads the game a step ahead — rarely dribbled past.',
      featured: false,
      joinDaysAgo: 320,
    },
    {
      name: 'Nafis Ahmed',
      inGameId: 'nafis.a',
      position: 'Defensive Mid',
      divisionRank: 'Division 2',
      goals: 12,
      matchesPlayed: 45,
      wins: 24,
      draws: 8,
      losses: 13,
      squadJson: JSON.stringify(['Rodri', 'Casemiro', 'Kante']),
      favoritePlayer: 'Rodri',
      bio: 'Breaks up attacks before they start.',
      featured: false,
      joinDaysAgo: 300,
    },
    {
      name: 'Rakib Hossain',
      inGameId: 'rakib_h',
      position: 'Midfielder',
      divisionRank: 'Division 2',
      goals: 19,
      matchesPlayed: 40,
      wins: 20,
      draws: 6,
      losses: 14,
      squadJson: JSON.stringify(['De Bruyne', 'Bellingham', 'Modric']),
      favoritePlayer: 'De Bruyne',
      bio: 'The vision passer — sets up more than he scores.',
      featured: false,
      joinDaysAgo: 260,
    },
    {
      name: 'Sabbir Khan',
      inGameId: 'sabbir_k',
      position: 'Full Back',
      divisionRank: 'Division 2',
      goals: 6,
      matchesPlayed: 35,
      wins: 17,
      draws: 5,
      losses: 13,
      squadJson: JSON.stringify(['Hakimi', 'Cancelo', 'Alaba']),
      favoritePlayer: 'Hakimi',
      bio: 'Overlaps constantly — as much an attacker as a defender.',
      featured: false,
      joinDaysAgo: 200,
    },
  ];

  for (const p of players) {
    const { joinDaysAgo, ...rest } = p;
    const existing = await prisma.player.findFirst({ where: { inGameId: rest.inGameId } });
    if (!existing) {
      await prisma.player.create({
        data: {
          ...rest,
          joinDate: new Date(Date.now() - joinDaysAgo * 24 * 60 * 60 * 1000),
        },
      });
    }
  }

  // --- Matches -----------------------------------------------------------
  // Real results from cobegbd.com's Rounds/Match History tab (confirmed via
  // its green/red W/L badges): 1 win (Young Boys fc, GRP3-R15, 7-0) and 12
  // losses, across all 13 GRP3 group-stage matches played so far. The
  // "(Main)"/"(Academy)" tag on each notes which of the club's two internal
  // sides fielded that match. No upcoming fixtures are seeded here — see
  // the note further down.
  function matchDate(dateStr: string, hour = 21, minute = 0): Date {
    const [y, m, d] = dateStr.split('-').map(Number);
    return new Date(y, m - 1, d, hour, minute, 0, 0);
  }

  const existingMatches = await prisma.match.count();
  if (existingMatches === 0) {
    await prisma.match.createMany({
      data: [
        { opponent: 'Young Boys fc', date: matchDate('2026-09-10'), ourScore: 7, opponentScore: 0, status: 'COMPLETED', competition: 'GRP3-R15 (Main)' },
        { opponent: 'Phoenix empire soldiers', date: matchDate('2026-09-07'), ourScore: 2, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R18 (Academy)' },
        { opponent: 'Warriors Of Pboc', date: matchDate('2026-09-04'), ourScore: 1, opponentScore: 10, status: 'COMPLETED', competition: 'GRP3-R6 (Main)' },
        { opponent: 'Soccer Kings Of Bangladesh', date: matchDate('2026-09-01'), ourScore: 2, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R10 (Academy)' },
        { opponent: 'Tornado Extreme', date: matchDate('2026-08-29'), ourScore: 1, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R8 (Main)' },
        { opponent: 'Golden Knights', date: matchDate('2026-08-26'), ourScore: 3, opponentScore: 8, status: 'COMPLETED', competition: 'Friendly (Main)' },
        { opponent: 'Phoenix empire soldiers', date: matchDate('2026-08-24'), ourScore: 0, opponentScore: 11, status: 'COMPLETED', competition: 'GRP3-R7 (Main)' },
        { opponent: 'Gang Of Efootball Brothers', date: matchDate('2026-08-22'), ourScore: 2, opponentScore: 9, status: 'COMPLETED', competition: 'GRP3-R9 (Academy)' },
        { opponent: 'Royal Bengal Efc Rbefc', date: matchDate('2026-08-10'), ourScore: 4, opponentScore: 5, status: 'COMPLETED', competition: 'GRP3-R5 (Main)' },
        { opponent: 'Young Boys fc', date: matchDate('2026-08-08'), ourScore: 5, opponentScore: 7, status: 'COMPLETED', competition: 'GRP3-R4 (Academy)' },
        { opponent: 'Pes Research Club', date: matchDate('2026-08-02'), ourScore: 1, opponentScore: 11, status: 'COMPLETED', competition: 'GRP3-R1 (Main)' },
        { opponent: 'Nk Darkstorm', date: matchDate('2026-08-06'), ourScore: 2, opponentScore: 10, status: 'COMPLETED', competition: 'GRP3-R3 (Main)' },
        { opponent: 'Air Eagles Efootball Club', date: matchDate('2026-08-04'), ourScore: 2, opponentScore: 10, status: 'COMPLETED', competition: 'GRP3-R2 (Academy)' },
        // "Synthwave Strikers" is the GROUP/DIVISION NAME on the tracker, not
        // an opponent — every match this club plays is labelled "Synthwave
        // Strikers GRP3-R#", so it never belongs in the opponent field. The
        // real upcoming fixtures (next opponent, date) aren't reliably
        // readable from the tracker yet — add them via /admin once known.
      ],
    });
  }

  // --- News ----------------------------------------------------------------
  const existingNews = await prisma.news.count();
  if (existingNews === 0) {
    await prisma.news.createMany({
      data: [
        {
          title: 'Nirbana United EFC is live',
          body: 'The club now has an official home online. Roster, fixtures, standings, and the gallery all live here from now on — bookmark it. Meditate. Dominate. Celebrate.',
          publishedDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
        },
        {
          title: '13 matches into the GRP3 group stage',
          body: "The squad has played 13 matches in the GRP3 group stage so far this season. Full match-by-match results are on the Matches page — Oishik Barua leads the scoring charts with 27 goals.",
          publishedDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        },
      ],
    });
  }

  // --- Standings -----------------------------------------------------------
  // The tracker only publishes a single ranking snapshot for us (see
  // ClubInfo achievements above), not a full league table with every team's
  // record — so this seeds just our own real All-Time ranking snapshot from
  // the tracker's Rankings tab (#112, FOUNDATION division). Played/won/
  // drawn/lost use the club's own official match record (14P-1W-0D-13L),
  // not the broader all-players personal-history total. Points are a
  // standard 3/1/0 calc from that real W-D-L (3), not something the tracker
  // itself publishes. Add real rows via /admin if a full table ever exists.
  const existingStanding = await prisma.standing.findFirst({ where: { isUs: true } });
  if (!existingStanding) {
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
  }

  // --- Gallery ---------------------------------------------------------------
  const existingGallery = await prisma.galleryImage.count();
  if (existingGallery === 0) {
    await prisma.galleryImage.createMany({
      data: [
        {
          imageUrl: '/brand/crest.jpg',
          caption: 'The Nirbana United EFC crest',
          uploadedDate: new Date(),
        },
      ],
    });
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
