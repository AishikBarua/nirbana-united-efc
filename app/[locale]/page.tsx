import Image from 'next/image';
import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { matchResultForUs } from '@/lib/utils';
import { countPlayers, sumPlayerWins } from '@/lib/services/playerService';
import { getRecentResults, getUpcomingFixtures } from '@/lib/services/matchService';
import { listNews } from '@/lib/services/newsService';
import { getOurStanding } from '@/lib/services/standingService';
import StatTile from '@/components/StatTile';
import NewsCard from '@/components/NewsCard';
import WinLossBadge from '@/components/WinLossBadge';

export default async function HomePage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('home');
  const format = await getFormatter();

  const [memberCount, totalWins, recentResults, upcomingFixtures, latestNews, ourStanding] = await Promise.all([
    countPlayers(),
    sumPlayerWins(),
    getRecentResults(4),
    getUpcomingFixtures(4),
    listNews(3),
    getOurStanding(),
  ]);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-gold-400/10">
        <div className="absolute inset-0 bg-radial-fade" />
        <div className="relative mx-auto flex max-w-6xl flex-col items-center gap-8 px-4 py-16 text-center sm:px-6 sm:py-24">
          <Image
            src="/brand/crest.jpg"
            alt="Nirbana United EFC crest"
            width={140}
            height={140}
            className="h-28 w-28 rounded-full ring-2 ring-gold-400/50 shadow-gold sm:h-36 sm:w-36 animate-rise"
            priority
          />
          <div className="animate-rise">
            <div className="mb-3 text-xs font-bold uppercase tracking-[0.35em] text-signal-teal">
              {t('heroKicker')}
            </div>
            <h1 className="font-display text-4xl font-black leading-tight text-gold-100 sm:text-6xl">
              Nirbana United <span className="text-gold-400">EFC</span>
            </h1>
            <p className="mx-auto mt-4 max-w-xl text-sm font-semibold uppercase tracking-[0.3em] text-gold-300/80 sm:text-base">
              Meditate. Dominate. Celebrate.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3 animate-rise">
            <Link href="/players" className="btn-primary">{t('heroCta')}</Link>
            <Link href="/matches" className="btn-secondary">{t('heroSecondaryCta')}</Link>
          </div>
        </div>
      </section>

      {/* Quick stats */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <StatTile label={t('statsMembers')} value={memberCount} />
          <StatTile label={t('statsWins')} value={totalWins} />
          <StatTile
            label={t('statsRank')}
            value={ourStanding ? `#${ourStanding.position}` : '—'}
          />
        </div>
      </section>

      {/* Recent matches + next fixtures */}
      <section className="mx-auto max-w-6xl px-4 pb-10 sm:px-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="card-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-gold-400/70">
                {t('recentResult')}
              </div>
              <Link href="/matches" className="text-[11px] font-bold uppercase tracking-wide text-signal-teal">
                {t('viewAllMatches')} →
              </Link>
            </div>
            {recentResults.length > 0 ? (
              <div className="flex flex-col gap-2">
                {recentResults.map((m) => {
                  const r = matchResultForUs(m.ourScore, m.opponentScore);
                  const accent = r === 'W' ? 'border-l-signal-green' : r === 'L' ? 'border-l-signal-red' : 'border-l-gold-400';
                  return (
                    <div
                      key={m.id}
                      className={`flex items-center gap-3 rounded-lg border border-gold-400/10 border-l-[3px] ${accent} bg-ink-900/60 px-3 py-2.5`}
                    >
                      {r && <WinLossBadge result={r} />}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-semibold text-gold-100">vs {m.opponent}</div>
                        <div className="truncate text-[11px] text-gold-100/40">
                          {format.dateTime(new Date(m.date), { dateStyle: 'medium' })}
                        </div>
                      </div>
                      <div className="shrink-0 text-lg font-bold text-gold-200">
                        {m.ourScore}–{m.opponentScore}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-gold-100/50">{t('noResults')}</p>
            )}
          </div>

          <div className="card-surface p-5">
            <div className="mb-3 flex items-center justify-between">
              <div className="text-xs font-bold uppercase tracking-widest text-gold-400/70">
                {t('upcomingFixture')}
              </div>
              <Link href="/matches" className="text-[11px] font-bold uppercase tracking-wide text-signal-teal">
                {t('viewAllMatches')} →
              </Link>
            </div>
            {upcomingFixtures.length > 0 ? (
              <div className="flex flex-col gap-2">
                {upcomingFixtures.map((m) => (
                  <div
                    key={m.id}
                    className="rounded-lg border border-gold-400/10 border-l-[3px] border-l-gold-400/60 bg-ink-900/60 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-sm font-semibold text-gold-100">vs {m.opponent}</div>
                      {m.competition && (
                        <span className="shrink-0 rounded-full border border-gold-400/25 px-2.5 py-0.5 text-[10px] font-semibold text-gold-300">
                          {m.competition}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[11px] text-gold-100/40">
                      {format.dateTime(new Date(m.date), { dateStyle: 'full', timeStyle: 'short' })}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gold-100/50">{t('noUpcoming')}</p>
            )}
          </div>
        </div>
      </section>

      {/* Latest news */}
      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="font-display text-2xl font-bold text-gold-100">{t('latestNews')}</h2>
          <Link href="/news" className="text-xs font-bold uppercase tracking-wide text-signal-teal">
            {t('viewAllNews')} →
          </Link>
        </div>
        {latestNews.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {latestNews.map((post) => (
              <NewsCard key={post.id} post={post} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-gold-100/50">{t('noNews')}</p>
        )}
      </section>
    </div>
  );
}
