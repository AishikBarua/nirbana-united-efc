import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { getAnalyticsSummary, getVisitLog } from '@/lib/services/analyticsService';
import AdminNav from '@/components/admin/AdminNav';

const RANGE_OPTIONS = [7, 30, 90] as const;

function Bar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? Math.max(4, Math.round((count / max) * 100)) : 0;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-xs">
        <span className="truncate text-gold-100/70">{label}</span>
        <span className="shrink-0 font-semibold text-gold-200">{count}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-ink-800">
        <div className="h-full rounded-full bg-gold-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default async function AdminAnalyticsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { page?: string; days?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.analytics');
  const format = await getFormatter();

  const rangeDays = RANGE_OPTIONS.includes(Number(searchParams.days) as (typeof RANGE_OPTIONS)[number])
    ? Number(searchParams.days)
    : 30;
  const page = Math.max(1, parseInt(searchParams.page || '1', 10) || 1);

  const [summary, log] = await Promise.all([
    getAnalyticsSummary(rangeDays),
    getVisitLog({ page, pageSize: 25 }),
  ]);

  const maxDaily = Math.max(1, ...summary.dailyVisits.map((d) => d.count));
  const maxPage = Math.max(1, ...summary.topPages.map((p) => p.count));
  const maxCountry = Math.max(1, ...summary.topCountries.map((c) => c.count));
  const maxDevice = Math.max(1, ...summary.deviceBreakdown.map((d) => d.count));
  const maxBrowser = Math.max(1, ...summary.browserBreakdown.map((b) => b.count));

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
        <p className="mt-1 text-sm text-gold-100/50">{t('subtitle')}</p>

        {/* Summary cards */}
        <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="card-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">
              {t('totalVisits')}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-gold-100">{summary.totalVisits}</div>
          </div>
          <div className="card-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">
              {t('totalUniqueVisitors')}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-gold-100">{summary.totalUniqueVisitors}</div>
          </div>
          <div className="card-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">
              {t('visitsToday')}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-signal-teal">{summary.visitsToday}</div>
          </div>
          <div className="card-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">
              {t('visitsInRange', { days: rangeDays })}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-gold-100">{summary.visitsInRange}</div>
          </div>
          <div className="card-surface p-4">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">
              {t('uniqueVisitorsInRange', { days: rangeDays })}
            </div>
            <div className="mt-1 font-display text-2xl font-bold text-gold-100">{summary.uniqueVisitorsInRange}</div>
          </div>
        </div>

        {/* Range switcher */}
        <div className="mt-6 flex gap-2">
          {RANGE_OPTIONS.map((d) => (
            <Link
              key={d}
              href={`/admin/analytics?days=${d}`}
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                rangeDays === d
                  ? 'bg-gold-400 text-ink-950'
                  : 'border border-gold-400/30 text-gold-200 hover:bg-gold-400/10'
              }`}
            >
              {t('lastNDays', { days: d })}
            </Link>
          ))}
        </div>

        {/* Daily trend */}
        <div className="card-surface mt-6 p-5">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
            {t('dailyTrend')}
          </h2>
          <div className="flex h-32 items-end gap-1">
            {summary.dailyVisits.map((d) => (
              <div key={d.date} className="group relative flex-1">
                <div
                  className="w-full rounded-t bg-gold-400/70 transition group-hover:bg-gold-300"
                  style={{ height: `${Math.max(2, Math.round((d.count / maxDaily) * 100))}%` }}
                />
                <div className="pointer-events-none absolute -top-7 left-1/2 hidden -translate-x-1/2 whitespace-nowrap rounded bg-ink-950 px-2 py-1 text-[10px] text-gold-100 shadow-card group-hover:block">
                  {d.date}: {d.count}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Breakdown grid */}
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="card-surface p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
              {t('topPages')}
            </h2>
            <div className="flex flex-col gap-3">
              {summary.topPages.length === 0 && <p className="text-xs text-gold-100/40">{t('noData')}</p>}
              {summary.topPages.map((p) => (
                <Bar key={p.path} label={p.path} count={p.count} max={maxPage} />
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
              {t('topCountries')}
            </h2>
            <div className="flex flex-col gap-3">
              {summary.topCountries.length === 0 && <p className="text-xs text-gold-100/40">{t('noData')}</p>}
              {summary.topCountries.map((c) => (
                <Bar key={c.country} label={c.country} count={c.count} max={maxCountry} />
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
              {t('deviceBreakdown')}
            </h2>
            <div className="flex flex-col gap-3">
              {summary.deviceBreakdown.length === 0 && <p className="text-xs text-gold-100/40">{t('noData')}</p>}
              {summary.deviceBreakdown.map((d) => (
                <Bar key={d.deviceType} label={d.deviceType} count={d.count} max={maxDevice} />
              ))}
            </div>
          </div>

          <div className="card-surface p-5">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
              {t('browserBreakdown')}
            </h2>
            <div className="flex flex-col gap-3">
              {summary.browserBreakdown.length === 0 && <p className="text-xs text-gold-100/40">{t('noData')}</p>}
              {summary.browserBreakdown.map((b) => (
                <Bar key={b.browser} label={b.browser} count={b.count} max={maxBrowser} />
              ))}
            </div>
          </div>
        </div>

        {/* Detailed log */}
        <div className="card-surface mt-6 overflow-x-auto p-5">
          <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
            {t('detailedLog')}
          </h2>
          <table className="w-full min-w-[720px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-gold-400/10 text-[10px] font-semibold uppercase tracking-wide text-gold-100/40">
                <th className="py-2 pr-3">{t('columnTime')}</th>
                <th className="py-2 pr-3">{t('columnPage')}</th>
                <th className="py-2 pr-3">{t('columnLocation')}</th>
                <th className="py-2 pr-3">{t('columnIp')}</th>
                <th className="py-2 pr-3">{t('columnDevice')}</th>
                <th className="py-2 pr-3">{t('columnVisitor')}</th>
              </tr>
            </thead>
            <tbody>
              {log.visits.map((v) => (
                <tr key={v.id} className="border-b border-gold-400/5 text-gold-100/70">
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {format.dateTime(new Date(v.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  </td>
                  <td className="py-2 pr-3 max-w-[200px] truncate" title={v.path}>
                    {v.path}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {[v.city, v.country].filter(Boolean).join(', ') || t('unknown')}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap font-mono">{v.ipAddress || t('unknown')}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    {[v.browser, v.os, v.deviceType].filter(Boolean).join(' · ') || t('unknown')}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap font-mono text-[10px] text-gold-100/40" title={v.visitorId}>
                    {v.visitorId.slice(0, 8)}…
                  </td>
                </tr>
              ))}
              {log.visits.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-gold-100/40">
                    {t('noData')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>

          {/* Pagination */}
          {log.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3 text-xs">
              <span className="text-gold-100/40">
                {t('pageOf', { page: log.page, totalPages: log.totalPages })}
              </span>
              <div className="flex gap-2">
                <Link
                  href={`/admin/analytics?days=${rangeDays}&page=${Math.max(1, log.page - 1)}`}
                  className={`rounded-md border border-gold-400/30 px-3 py-1.5 font-semibold uppercase tracking-wide text-gold-200 hover:bg-gold-400/10 ${
                    log.page <= 1 ? 'pointer-events-none opacity-30' : ''
                  }`}
                >
                  {t('previous')}
                </Link>
                <Link
                  href={`/admin/analytics?days=${rangeDays}&page=${Math.min(log.totalPages, log.page + 1)}`}
                  className={`rounded-md border border-gold-400/30 px-3 py-1.5 font-semibold uppercase tracking-wide text-gold-200 hover:bg-gold-400/10 ${
                    log.page >= log.totalPages ? 'pointer-events-none opacity-30' : ''
                  }`}
                >
                  {t('next')}
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
