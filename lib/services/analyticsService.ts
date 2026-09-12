import { prisma } from '@/lib/db';

/**
 * Data access for the admin-only visitor analytics feature
 * (/admin/analytics). Every write comes from app/api/track/route.ts (a
 * public, unauthenticated endpoint pinged by components/VisitTracker.tsx on
 * every page load / client-side route change); every read here is only
 * ever called from admin-protected pages.
 *
 * Aggregation note: day-bucketing for the trend chart is done in
 * JavaScript rather than with a SQL date-truncation function, because this
 * project runs on two different database engines (SQLite locally,
 * Postgres in production — see prisma/schema.prisma vs
 * prisma/schema.production.prisma) and SQLite/Postgres don't share a single
 * `groupBy`-friendly date-truncation expression through Prisma. Traffic for
 * a small club site is nowhere near large enough for this to matter
 * performance-wise.
 */

export interface RecordVisitInput {
  visitorId: string;
  path: string;
  locale?: string | null;
  ipAddress?: string | null;
  country?: string | null;
  countryCode?: string | null;
  city?: string | null;
  userAgent?: string | null;
  browser?: string | null;
  os?: string | null;
  deviceType?: string | null;
  referrer?: string | null;
}

export function recordVisit(input: RecordVisitInput) {
  return prisma.siteVisit.create({ data: input });
}

export interface AnalyticsSummary {
  rangeDays: number;
  totalVisits: number;
  totalUniqueVisitors: number;
  visitsToday: number;
  visitsInRange: number;
  uniqueVisitorsInRange: number;
  topPages: { path: string; count: number }[];
  topCountries: { country: string; count: number }[];
  deviceBreakdown: { deviceType: string; count: number }[];
  browserBreakdown: { browser: string; count: number }[];
  dailyVisits: { date: string; count: number }[]; // ascending, YYYY-MM-DD, one entry per day in range
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function dateKey(d: Date): string {
  return d.toISOString().slice(0, 10); // YYYY-MM-DD
}

export async function getAnalyticsSummary(rangeDays = 30): Promise<AnalyticsSummary> {
  const now = new Date();
  const todayStart = startOfDay(now);
  const rangeStart = startOfDay(new Date(now.getTime() - (rangeDays - 1) * 24 * 60 * 60 * 1000));

  const [
    totalVisits,
    distinctAllTime,
    visitsToday,
    visitsInRange,
    distinctInRange,
    pageGroups,
    countryGroups,
    deviceGroups,
    browserGroups,
    rangeCreatedAts,
  ] = await Promise.all([
    prisma.siteVisit.count(),
    prisma.siteVisit.findMany({ select: { visitorId: true }, distinct: ['visitorId'] }),
    prisma.siteVisit.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.siteVisit.count({ where: { createdAt: { gte: rangeStart } } }),
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { visitorId: true },
      distinct: ['visitorId'],
    }),
    prisma.siteVisit.groupBy({
      by: ['path'],
      where: { createdAt: { gte: rangeStart } },
      _count: { path: true },
      orderBy: { _count: { path: 'desc' } },
      take: 8,
    }),
    prisma.siteVisit.groupBy({
      by: ['country'],
      where: { createdAt: { gte: rangeStart }, country: { not: null } },
      _count: { country: true },
      orderBy: { _count: { country: 'desc' } },
      take: 8,
    }),
    prisma.siteVisit.groupBy({
      by: ['deviceType'],
      where: { createdAt: { gte: rangeStart } },
      _count: { deviceType: true },
      orderBy: { _count: { deviceType: 'desc' } },
    }),
    prisma.siteVisit.groupBy({
      by: ['browser'],
      where: { createdAt: { gte: rangeStart } },
      _count: { browser: true },
      orderBy: { _count: { browser: 'desc' } },
      take: 8,
    }),
    prisma.siteVisit.findMany({
      where: { createdAt: { gte: rangeStart } },
      select: { createdAt: true },
    }),
  ]);

  // Bucket the range's timestamps into one count per calendar day, filling
  // in zero for any day with no visits so the chart has an even axis.
  const dayBuckets = new Map<string, number>();
  for (let i = 0; i < rangeDays; i++) {
    const d = new Date(rangeStart.getTime() + i * 24 * 60 * 60 * 1000);
    dayBuckets.set(dateKey(d), 0);
  }
  for (const row of rangeCreatedAts) {
    const key = dateKey(new Date(row.createdAt));
    dayBuckets.set(key, (dayBuckets.get(key) ?? 0) + 1);
  }
  const dailyVisits = Array.from(dayBuckets.entries()).map(([date, count]) => ({ date, count }));

  return {
    rangeDays,
    totalVisits,
    totalUniqueVisitors: distinctAllTime.length,
    visitsToday,
    visitsInRange,
    uniqueVisitorsInRange: distinctInRange.length,
    topPages: pageGroups.map((g) => ({ path: g.path, count: g._count.path })),
    topCountries: countryGroups.map((g) => ({ country: g.country ?? 'Unknown', count: g._count.country })),
    deviceBreakdown: deviceGroups.map((g) => ({
      deviceType: g.deviceType ?? 'unknown',
      count: g._count.deviceType,
    })),
    browserBreakdown: browserGroups.map((g) => ({ browser: g.browser ?? 'Other', count: g._count.browser })),
    dailyVisits,
  };
}

export interface VisitLogFilters {
  page?: number;
  pageSize?: number;
}

export async function getVisitLog({ page = 1, pageSize = 25 }: VisitLogFilters = {}) {
  const safePage = Math.max(1, page);
  const safePageSize = Math.min(100, Math.max(1, pageSize));

  const [visits, total] = await Promise.all([
    prisma.siteVisit.findMany({
      orderBy: { createdAt: 'desc' },
      skip: (safePage - 1) * safePageSize,
      take: safePageSize,
    }),
    prisma.siteVisit.count(),
  ]);

  return {
    visits,
    total,
    page: safePage,
    pageSize: safePageSize,
    totalPages: Math.max(1, Math.ceil(total / safePageSize)),
  };
}
