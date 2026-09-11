import { prisma } from '@/lib/db';

export type NotificationType = 'MATCH_RESULT' | 'UPCOMING_FIXTURE' | 'NEWS';

export type NotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  href?: string;
};

// How long a notification stays around before it's pruned (see
// pruneOldNotifications). Purely a housekeeping limit — nothing reads
// notifications older than this on purpose, so there's no real cost to
// dropping them; it just keeps the table from growing forever across months
// of hourly syncs.
const MAX_AGE_DAYS = 90;

/** Newest-first, for the bell icon's dropdown. */
export function listNotifications(limit = 30) {
  return prisma.notification.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
  });
}

export function createNotification(input: NotificationInput) {
  return prisma.notification.create({ data: input });
}

/** Bulk insert used by trackerSync.ts — a no-op (not an error) when nothing
 * new happened this sync, which is the common case. */
export async function createNotifications(inputs: NotificationInput[]) {
  if (inputs.length === 0) return;
  await prisma.notification.createMany({ data: inputs });
}

export async function pruneOldNotifications() {
  const cutoff = new Date(Date.now() - MAX_AGE_DAYS * 24 * 60 * 60 * 1000);
  await prisma.notification.deleteMany({ where: { createdAt: { lt: cutoff } } });
}
