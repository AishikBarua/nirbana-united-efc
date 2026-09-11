import { prisma } from '@/lib/db';

/**
 * Transfer log, populated by the tracker sync (sync-with-tracker.bat locally,
 * or the "Sync with Tracker" button in /admin online) — never admin-edited
 * directly. Wrapped in try/catch (not .catch()) since a Prisma client that
 * predates this table throws synchronously on property access, not as a
 * rejected promise — this keeps callers getting a safe empty list either way
 * (a sync hasn't run yet, or the schema needs a push), instead of a 500.
 */
export async function listTransfers() {
  try {
    return await prisma.transfer.findMany({ orderBy: { order: 'asc' } });
  } catch {
    return [];
  }
}
