/**
 * Production seed — creates ONLY the first admin account, nothing else.
 *
 * Unlike prisma/seed.ts (used for local development, which also loads
 * placeholder sample players/matches/news so the site is never empty on
 * your PC), the live production database should start with real data —
 * clicking "Sync with Tracker Now" on the admin dashboard right after your
 * first login pulls in the real roster, matches, and club info directly
 * from the tracker. Seeding demo players/news/gallery rows here would mean
 * manually deleting fake content from the live site afterwards, since
 * News, Gallery, and Standings rows are never auto-removed by a sync.
 *
 * Run with: npm run db:seed:production
 * (only ever needs to run ONCE, against the production DATABASE_URL — see
 * scripts/setup-netlify-database.bat, which runs this automatically)
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const adminEmail = process.env.ADMIN_EMAIL || 'admin@nirbanaunited.club';
  const adminPassword = process.env.ADMIN_PASSWORD || 'ChangeMe123!';

  const existingAdmin = await prisma.admin.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 12);
    await prisma.admin.create({ data: { email: adminEmail, passwordHash } });
    console.log(`Created production admin account: ${adminEmail} (change the password after your first login)`);
  } else {
    console.log(`Admin account already exists: ${adminEmail} — nothing to do.`);
  }

  console.log('Production seed complete. Log in and click "Sync with Tracker Now" to load real club data.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
