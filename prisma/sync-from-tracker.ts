/**
 * CLI entry point for "sync with the tracker" — the script behind the
 * local "sync-with-tracker.bat" double-click file.
 *
 * Run with: npx tsx prisma/sync-from-tracker.ts
 *
 * All the actual fetching/parsing/validating/writing logic lives in
 * lib/trackerSync.ts (runTrackerSync), shared with the admin-panel "Sync
 * with Tracker" button (app/api/admin/sync-tracker/route.ts) so both paths
 * behave identically. This file just adapts that shared result into
 * console output and a process exit code, which only makes sense for a
 * script run from a terminal/.bat file — not for a web request.
 */
import { prisma } from '../lib/db';
import { runTrackerSync } from '../lib/trackerSync';

async function main() {
  console.log("Fetching the tracker's public pages...");
  const result = await runTrackerSync();

  if (!result.ok) {
    console.error("\nSync ABORTED — nothing was written. The tracker's numbers did not cross-check:");
    for (const p of result.problems) console.error(`  - ${p}`);
    console.error('\nThis usually means the tracker changed its page layout and the parser in');
    console.error('this script needs a small update — it does NOT mean your data is wrong.');
    process.exitCode = 1;
    return;
  }

  const s = result.summary;
  console.log('All cross-checks passed. Writing to the database...');
  console.log(
    `\nDone. Synced ${s.players} players, ${s.matches} matches, ${s.transfers} transfer log entries, and ${s.rankings} ranking snapshots.`
  );
  console.log(
    `Official match record: ${s.officialRecord.played} played, ${s.officialRecord.wins}W-${s.officialRecord.draws}D-${s.officialRecord.losses}L, ${s.officialRecord.gf}:${s.officialRecord.ga}.`
  );
  console.log('Refresh the site in your browser to see the update (the dev server picks up database changes immediately).');
}

main()
  .catch((e) => {
    console.error('\nSync failed with an unexpected error:');
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
