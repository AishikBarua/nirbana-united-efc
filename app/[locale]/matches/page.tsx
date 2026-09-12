import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { matchResultForUs } from '@/lib/utils';
import { listUpcomingMatches, listCompletedMatches } from '@/lib/services/matchService';
import SectionHeading from '@/components/SectionHeading';
import WinLossBadge from '@/components/WinLossBadge';
import ScrollToHash from '@/components/ScrollToHash';
import { CareerResultDonut as ResultDonut } from '@/components/PlayerStatsCharts';
import { GoalsTrendChart, FormStrip } from '@/components/MatchStatsCharts';

export default async function MatchesPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('matches');
  const format = await getFormatter();

  const [upcoming, results] = await Promise.all([listUpcomingMatches(), listCompletedMatches()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <ScrollToHash />
      <SectionHeading title={t('title')} />

      <section className="mb-10">
        <h2 className="mb-4 font-display text-lg font-bold text-gold-300">{t('upcoming')}</h2>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <div key={m.id} id={m.id} className="card-surface flex scroll-mt-20 items-center justify-between gap-4 p-4">
                <div>
                  <div className="font-display text-base font-bold text-gold-100">
                    Nirbana United {t('vs')} {m.opponent}
                  </div>
                  <div className="mt-1 text-xs text-gold-100/40">
                    {format.dateTime(new Date(m.date), { dateStyle: 'full', timeStyle: 'short' })}
                  </div>
                  {m.notes && <div className="mt-0.5 text-[11px] italic text-gold-100/30">{m.notes}</div>}
                </div>
                {m.competition && (
                  <span className="stat-pill whitespace-nowrap text-xs">{m.competition}</span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gold-100/50">{t('noUpcoming')}</p>
        )}
      </section>

      <section>
        <h2 className="mb-4 font-display text-lg font-bold text-gold-300">{t('results')}</h2>
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((m) => {
              const result = matchResultForUs(m.ourScore, m.opponentScore);
              return (
                <div key={m.id} id={m.id} className="card-surface flex scroll-mt-20 items-center gap-4 p-4">
                  {result && <WinLossBadge result={result} />}
                  <div className="flex-1">
                    <div className="font-display text-base font-bold text-gold-100">
                      Nirbana United {t('vs')} {m.opponent}
                    </div>
                    <div className="mt-1 text-xs text-gold-100/40">
                      {format.dateTime(new Date(m.date), { dateStyle: 'medium' })}
                      {m.competition ? ` · ${m.competition}` : ''}
                    </div>
                    {m.notes && <div className="mt-0.5 text-[11px] italic text-gold-100/30">{m.notes}</div>}
                  </div>
                  <div className="font-display text-xl font-bold text-gold-200">
                    {m.ourScore} – {m.opponentScore}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gold-100/50">{t('noResults')}</p>
        )}
      </section>

      {results.length > 0 && (
        <section className="mt-12">
          <h2 className="mb-4 font-display text-lg font-bold text-gold-300">{t('statsTitle')}</h2>

          {(() => {
            const played = results.length;
            const wins = results.filter((m) => m.ourScore! > m.opponentScore!).length;
            const draws = results.filter((m) => m.ourScore! === m.opponentScore!).length;
            const losses = played - wins - draws;
            const goalsFor = results.reduce((s, m) => s + (m.ourScore ?? 0), 0);
            const goalsAgainst = results.reduce((s, m) => s + (m.opponentScore ?? 0), 0);
            const cleanSheets = results.filter((m) => (m.opponentScore ?? 0) === 0).length;
            const winPct = played ? (((wins + draws / 2) / played) * 100).toFixed(1) : '0.0';
            const gfPerMatch = played ? (goalsFor / played).toFixed(2) : '0.00';

            return (
              <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
                {[
                  { label: t('played'), value: played },
                  { label: t('wins'), value: wins },
                  { label: t('draws'), value: draws },
                  { label: t('losses'), value: losses },
                  { label: t('goalsFor'), value: goalsFor },
                  { label: t('goalsAgainst'), value: goalsAgainst },
                  { label: t('winPct'), value: `${winPct}%` },
                  { label: t('gfPerMatch'), value: gfPerMatch },
                  { label: t('cleanSheets'), value: cleanSheets },
                ].map((stat) => (
                  <div key={stat.label} className="card-surface p-3 text-center">
                    <div className="font-display text-lg font-bold text-gold-300">{stat.value}</div>
                    <div className="mt-1 text-[9px] uppercase tracking-wide text-gold-100/40">{stat.label}</div>
                  </div>
                ))}
              </div>
            );
          })()}

          {(() => {
            const chronological = [...results].reverse(); // listCompletedMatches() is newest-first; charts read left-to-right oldest-to-newest
            const wins = results.filter((m) => m.ourScore! > m.opponentScore!).length;
            const draws = results.filter((m) => m.ourScore! === m.opponentScore!).length;
            const losses = results.length - wins - draws;
            const recentForm = chronological.slice(-10).map((m) => matchResultForUs(m.ourScore, m.opponentScore)!);

            return (
              <div className="mt-8 grid gap-6 sm:grid-cols-2">
                <div className="card-surface p-4">
                  <h3 className="mb-3 font-display text-base font-bold text-gold-300">{t('resultBreakdown')}</h3>
                  <ResultDonut wins={wins} draws={draws} losses={losses} />
                </div>
                <div className="card-surface p-4">
                  <h3 className="mb-3 font-display text-base font-bold text-gold-300">{t('recentForm')}</h3>
                  <FormStrip results={recentForm} />
                </div>
                <div className="card-surface p-4 sm:col-span-2">
                  <h3 className="mb-3 font-display text-base font-bold text-gold-300">{t('goalsTrend')}</h3>
                  {/* Prisma types ourScore/opponentScore as nullable (the column allows it for
                      not-yet-played matches), but `results` here is already filtered to completed
                      matches only — same assumption the `m.ourScore!` asserts above already make. */}
                  <GoalsTrendChart
                    matches={chronological.map((m) => ({ ...m, ourScore: m.ourScore!, opponentScore: m.opponentScore! }))}
                  />
                </div>
              </div>
            );
          })()}

          <h3 className="mb-3 mt-8 font-display text-base font-bold text-gold-300">{t('byOpponent')}</h3>
          {(() => {
            const byOpponent = new Map<
              string,
              { played: number; wins: number; draws: number; losses: number; gf: number; ga: number }
            >();
            for (const m of results) {
              const row = byOpponent.get(m.opponent) ?? { played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 };
              row.played += 1;
              row.gf += m.ourScore ?? 0;
              row.ga += m.opponentScore ?? 0;
              if (m.ourScore! > m.opponentScore!) row.wins += 1;
              else if (m.ourScore! === m.opponentScore!) row.draws += 1;
              else row.losses += 1;
              byOpponent.set(m.opponent, row);
            }
            const rows = Array.from(byOpponent.entries()).sort((a, b) => b[1].played - a[1].played);
            return (
              <div className="card-surface overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-gold-400/15 text-left text-[11px] uppercase tracking-wide text-gold-100/40">
                      <th className="px-4 py-3 font-semibold">{t('opponent')}</th>
                      <th className="px-3 py-3 text-center font-semibold">{t('played')}</th>
                      <th className="px-3 py-3 text-center font-semibold">{t('wins')}</th>
                      <th className="px-3 py-3 text-center font-semibold">{t('draws')}</th>
                      <th className="px-3 py-3 text-center font-semibold">{t('losses')}</th>
                      <th className="px-3 py-3 text-center font-semibold">GF:GA</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map(([opponent, row]) => (
                      <tr key={opponent} className="border-b border-gold-400/5 last:border-0">
                        <td className="px-4 py-3 font-medium text-gold-100/80">{opponent}</td>
                        <td className="px-3 py-3 text-center text-gold-100/60">{row.played}</td>
                        <td className="px-3 py-3 text-center text-gold-100/60">{row.wins}</td>
                        <td className="px-3 py-3 text-center text-gold-100/60">{row.draws}</td>
                        <td className="px-3 py-3 text-center text-gold-100/60">{row.losses}</td>
                        <td className="px-3 py-3 text-center text-gold-100/60">
                          {row.gf}:{row.ga}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </section>
      )}
    </div>
  );
}
