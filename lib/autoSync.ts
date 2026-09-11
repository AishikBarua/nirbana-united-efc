/**
 * Background "auto-sync" — periodically calls the exact same runTrackerSync()
 * the admin's "Sync with Tracker Now" button uses, without anyone having to
 * click anything. Started once by instrumentation.ts when the Next.js server
 * boots (see that file for why it's the right place to do this).
 *
 * This is intentionally NOT a new npm dependency (e.g. node-cron) — this
 * project can't currently reach the npm registry to install one, and a
 * plain setInterval is all a single "keep checking every N minutes while
 * the process is alive" timer actually needs.
 *
 * Important limits, by nature of how this app runs (see trackerSync.ts's
 * own header comment for the two ways this app can run):
 *   - This only checks while the Node process is actually running — i.e.
 *     while the "npm run dev" window (setup-and-run.bat) is open on your
 *     PC, or while a deployed server is up. If your PC is off or that
 *     window is closed, nothing syncs until it's started again — there is
 *     no cloud server involved that could do this while your PC is off.
 *   - It reuses runTrackerSync()'s own all-or-nothing validation, so a
 *     background run is exactly as safe as clicking the button yourself:
 *     if the tracker's numbers don't add up, nothing gets written and it
 *     just quietly tries again next hour.
 */
import { runTrackerSync } from './trackerSync';

const SYNC_INTERVAL_MS = 60 * 60 * 1000; // once an hour
const STARTUP_DELAY_MS = 20 * 1000; // let the dev server finish booting first

// Guards against starting more than one timer in the same process. In dev,
// Next.js can re-invoke instrumentation's register() across Fast Refresh
// reloads of server code; without this guard that would stack up duplicate
// hourly timers (harmless to the data — runTrackerSync() is safe to call
// concurrently with itself — but pointless extra load on cobegbd.com).
let started = false;

async function runOnce(reason: 'startup' | 'scheduled') {
  const label = reason === 'startup' ? 'startup check' : 'hourly check';
  try {
    const result = await runTrackerSync();
    if (result.ok) {
      console.log(
        `[auto-sync] ${label}: synced OK — ${result.summary.players} players, ${result.summary.matches} matches, ${result.summary.fixtures} upcoming fixtures.`
      );
    } else {
      console.warn(`[auto-sync] ${label}: skipped — tracker data didn't cross-check cleanly:`, result.problems);
    }
  } catch (err) {
    console.error(`[auto-sync] ${label}: failed —`, err instanceof Error ? err.message : err);
  }
}

export function startAutoSync() {
  if (started) return;
  started = true;

  console.log('[auto-sync] Background tracker sync enabled — will check cobegbd.com once an hour while this server is running.');
  setTimeout(() => void runOnce('startup'), STARTUP_DELAY_MS);
  setInterval(() => void runOnce('scheduled'), SYNC_INTERVAL_MS);
}
