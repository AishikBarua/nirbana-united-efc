/**
 * Next.js calls register() exactly once when the server process starts (see
 * https://nextjs.org/docs/app/building-your-application/optimizing/instrumentation
 * — needs experimental.instrumentationHook in next.config.mjs on Next 14).
 * This is where the hourly background tracker sync (lib/autoSync.ts) gets
 * switched on, so it starts automatically with the server itself — no admin
 * click, no separate script to remember to run.
 *
 * Guarded to the Node.js runtime only: Next.js also calls register() for the
 * Edge runtime in some configurations, and setInterval/the Prisma client
 * this depends on aren't meaningful there.
 *
 * Also skipped entirely on Netlify (process.env.NETLIFY is set there
 * automatically): a serverless function's process doesn't stay alive
 * between requests, so this setInterval would never reliably fire — worse,
 * a fresh cold start could re-run the "startup" sync far more often than
 * intended. netlify/functions/hourly-sync.mts replaces this on Netlify
 * instead, using Netlify's own Scheduled Functions.
 */
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs' && !process.env.NETLIFY) {
    const { startAutoSync } = await import('./lib/autoSync');
    startAutoSync();
  }
}
