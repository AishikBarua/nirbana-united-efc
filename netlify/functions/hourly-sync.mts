import type { Config } from '@netlify/functions';

/**
 * Netlify's replacement for lib/autoSync.ts's setInterval, which only works
 * on a long-running server process (your PC via setup-and-run.bat, or any
 * host that keeps a Node process alive) — a serverless function's process
 * doesn't stay running between invocations, so a timer inside one would
 * never actually fire. Netlify Scheduled Functions solve this by having
 * Netlify itself invoke this file on a schedule instead.
 *
 * Deliberately has ZERO imports from this project's own app/lib code —
 * Netlify Functions are bundled independently from the Next.js app, and
 * this project's other files use the `@/` TypeScript path alias, which
 * isn't guaranteed to resolve correctly inside that separate bundling step.
 * Instead this just calls the site's own API over HTTPS, exactly like a
 * browser would, authenticated with a shared secret instead of an admin
 * login (see app/api/internal/scheduled-sync/route.ts).
 */
export default async () => {
  const siteUrl = process.env.URL || process.env.DEPLOY_URL;
  const secret = process.env.SYNC_SECRET;

  if (!siteUrl || !secret) {
    console.error('[hourly-sync] Missing URL or SYNC_SECRET environment variable — skipping this run.');
    return;
  }

  try {
    const res = await fetch(`${siteUrl}/api/internal/scheduled-sync`, {
      method: 'POST',
      headers: { 'x-sync-secret': secret },
    });
    const body = await res.json().catch(() => null);
    if (res.ok) {
      console.log('[hourly-sync] done:', body);
    } else {
      console.warn('[hourly-sync] request failed:', res.status, body);
    }
  } catch (err) {
    console.error('[hourly-sync] failed:', err instanceof Error ? err.message : err);
  }
};

export const config: Config = {
  schedule: '@hourly',
};
