import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getMatchReport } from '@/lib/services/matchService';
import type { StatRow } from '@/lib/matchReportSync';
import BackLink from '@/components/BackLink';

function StatRowBar({ row }: { row: StatRow }) {
  return (
    <div className="flex items-center gap-3 py-2 text-sm">
      <span className={`w-14 shrink-0 text-right font-semibold ${row.homeWins ? 'text-gold-300' : 'text-gold-100/60'}`}>
        {row.homeValue}
      </span>
      <span className="flex-1 text-center text-[11px] uppercase tracking-wide text-gold-100/40">{row.label}</span>
      <span className={`w-14 shrink-0 text-left font-semibold ${row.awayWins ? 'text-gold-300' : 'text-gold-100/60'}`}>
        {row.awayValue}
      </span>
    </div>
  );
}

export default async function MatchReportPage({
  params: { locale, cobegMatchId },
}: {
  params: { locale: string; cobegMatchId: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('matchReport');

  const id = parseInt(cobegMatchId, 10);
  const report = Number.isFinite(id) ? await getMatchReport(id) : null;
  if (!report) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <BackLink href="/matches" label={t('backToMatches')} />

      {/* Header */}
      <div className="card-surface p-6">
        <div className="mb-3 text-center text-xs font-bold uppercase tracking-[0.25em] text-gold-400/80">
          {report.tournament}
          {report.round ? ` · ${report.round}` : ''}
        </div>
        <div className="flex items-center justify-between gap-3 sm:gap-6">
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            {report.homeTeam.crest && (
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-gold-400/30 bg-ink-800 sm:h-16 sm:w-16">
                <Image src={report.homeTeam.crest} alt={report.homeTeam.name} fill sizes="64px" className="object-cover" />
              </div>
            )}
            <div className="font-display text-sm font-bold text-gold-100 sm:text-base">{report.homeTeam.name}</div>
          </div>
          <div className="flex shrink-0 flex-col items-center">
            <div className="font-display text-3xl font-bold text-gold-200 sm:text-4xl">
              {report.homeScore} – {report.awayScore}
            </div>
            <div className="mt-1 text-[11px] uppercase tracking-wide text-gold-100/40">{report.status}</div>
          </div>
          <div className="flex flex-1 flex-col items-center gap-2 text-center">
            {report.awayTeam.crest && (
              <div className="relative h-14 w-14 overflow-hidden rounded-full border border-gold-400/30 bg-ink-800 sm:h-16 sm:w-16">
                <Image src={report.awayTeam.crest} alt={report.awayTeam.name} fill sizes="64px" className="object-cover" />
              </div>
            )}
            <div className="font-display text-sm font-bold text-gold-100 sm:text-base">{report.awayTeam.name}</div>
          </div>
        </div>
        {report.dateText && <div className="mt-3 text-center text-xs text-gold-100/40">{report.dateText}</div>}
      </div>

      {/* Man of the Match */}
      {report.manOfTheMatch && (
        <section className="card-surface mt-6 p-6 text-center">
          <h2 className="mb-2 font-display text-lg font-bold text-gold-200">{t('manOfTheMatch')}</h2>
          <div className="font-display text-xl font-bold text-gold-100">{report.manOfTheMatch.name}</div>
          <div className="mt-1 text-xs text-gold-100/40">{report.manOfTheMatch.resultText}</div>
        </section>
      )}

      {/* Aggregate team stats */}
      {report.aggregateStats.length > 0 && (
        <section className="card-surface mt-6 p-6">
          <h2 className="mb-2 font-display text-lg font-bold text-gold-200">{t('teamStats')}</h2>
          <div className="mb-2 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-gold-100/50">
            <span>{report.homeTeam.name}</span>
            <span>{report.awayTeam.name}</span>
          </div>
          <div className="divide-y divide-gold-400/10">
            {report.aggregateStats.map((row, i) => (
              <StatRowBar key={i} row={row} />
            ))}
          </div>
        </section>
      )}

      {/* Player comparisons */}
      {report.playerCards.length > 0 && (
        <section className="mt-6">
          <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('playerComparisons')}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {report.playerCards.map((card, i) => (
              <div
                key={i}
                className={`card-surface p-4 ${card.isFeatured ? 'ring-1 ring-gold-400/60' : ''}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0 flex-1 text-left">
                    <div className="truncate text-sm font-semibold text-gold-100">{card.homePlayerName}</div>
                    {card.homePlayerRank && <div className="text-[10px] text-gold-100/40">{card.homePlayerRank}</div>}
                  </div>
                  <div className="shrink-0 font-display text-base font-bold text-gold-300">
                    {card.homeScore} – {card.awayScore}
                  </div>
                  <div className="min-w-0 flex-1 text-right">
                    <div className="truncate text-sm font-semibold text-gold-100">{card.awayPlayerName}</div>
                  </div>
                </div>

                {card.stats.length > 0 ? (
                  <div className="mt-2 divide-y divide-gold-400/10 border-t border-gold-400/10">
                    {card.stats.map((row, j) => (
                      <StatRowBar key={j} row={row} />
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 border-t border-gold-400/10 pt-2 text-center text-[11px] text-gold-100/30">
                    {t('benchPlayer')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
