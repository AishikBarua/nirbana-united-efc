import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import SectionHeading from '@/components/SectionHeading';
import { listRankingSnapshots } from '@/lib/services/rankingService';

export default async function RankingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('rankings');

  // Populated by the tracker sync (sync-with-tracker.bat locally, or the
  // "Sync with Tracker" button in /admin online) — the service returns a
  // safe empty list if a sync hasn't run yet, rather than throwing.
  const rankings = await listRankingSnapshots();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionHeading title={t('title')} eyebrow={t('eyebrow')} />
      <p className="mb-8 text-sm text-gold-100/50">{t('subtitle')}</p>

      {rankings.length > 0 ? (
        <div className="space-y-5">
          {rankings.map((r) => (
            <div key={r.id} className="card-surface p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-[0.25em] text-gold-400/70">{r.scope}</div>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="font-display text-2xl font-bold text-gold-200">#{r.position}</span>
                    <span className="stat-pill text-[11px]">{r.division}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-display text-lg font-bold text-gold-300">{r.rating.toFixed(2)}</div>
                  <div className="text-[10px] uppercase tracking-wide text-gold-100/40">{t('rating')}</div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
                {[
                  { label: t('played'), value: r.played },
                  { label: t('wins'), value: r.wins },
                  { label: t('draws'), value: r.draws },
                  { label: t('goalsFor'), value: r.goalsFor },
                  { label: t('goalsAgainst'), value: r.goalsAgainst },
                  { label: t('winPct'), value: `${r.winPct.toFixed(1)}%` },
                ].map((stat) => (
                  <div key={stat.label} className="rounded-lg bg-ink-800/60 p-2.5 text-center">
                    <div className="font-display text-sm font-bold text-gold-200">{stat.value}</div>
                    <div className="mt-0.5 text-[9px] uppercase tracking-wide text-gold-100/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gold-100/50">{t('noRankings')}</p>
      )}

      <p className="mt-6 text-xs text-gold-100/35">{t('note')}</p>
    </div>
  );
}
