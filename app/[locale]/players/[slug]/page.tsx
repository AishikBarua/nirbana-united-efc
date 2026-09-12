import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { parseJsonArray, winRate } from '@/lib/utils';
import { getPlayerByRouteParam, getPlayerStatHistory } from '@/lib/services/playerService';
import PlayerPhoto from '@/components/PlayerPhoto';
import { CareerResultDonut, CareerVsSeasonBars, StatTrendChart } from '@/components/PlayerStatsCharts';
import BackLink from '@/components/BackLink';
import FloatingBackLink from '@/components/FloatingBackLink';

export default async function PlayerProfilePage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('playerProfile');
  const format = await getFormatter();

  const player = await getPlayerByRouteParam(slug);
  if (!player) notFound();

  const squad = parseJsonArray(player.squadJson);
  const statHistory = await getPlayerStatHistory(player.inGameId);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <BackLink href="/players" label={t('backToRoster')} />
      <FloatingBackLink href="/players" label={t('backToRoster')} />

      <div className="card-surface overflow-hidden">
        <div className="relative h-24 overflow-hidden bg-gradient-to-br from-gold-900/40 via-ink-800 to-ink-900 sm:h-28">
          <div className="absolute inset-0 bg-radial-fade" />
          <div className="absolute inset-0 flex items-center justify-center opacity-[0.08]">
            <Image src="/brand/crest.jpg" alt="" width={96} height={96} className="h-16 w-16 rounded-full object-cover sm:h-20 sm:w-20" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-4 px-6 pb-6 sm:flex-row sm:items-end">
          <div className="relative -mt-16 h-32 w-32 flex-shrink-0 overflow-hidden rounded-2xl border-4 border-ink-850 bg-ink-800 shadow-gold sm:-mt-20 sm:h-40 sm:w-40">
            <PlayerPhoto photoUrl={player.photoUrl} name={player.name} sizes="160px" fallbackClassName="text-5xl" />
          </div>
          <div className="flex-1 text-center sm:pb-2 sm:text-left">
            <h1 className="font-display text-2xl font-bold text-gold-100 sm:text-3xl">{player.name}</h1>
            <div className="mt-1 text-sm text-gold-100/50">@{player.inGameId} · {player.position}</div>
          </div>
          <div className="flex flex-col items-center gap-1.5 sm:mb-2 sm:items-end">
            <div className="stat-pill">{player.divisionRank}</div>
            {player.squadNumber && (
              <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">
                {player.squadNumber}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-center gap-2 text-xs text-gold-100/50 sm:justify-start">
        <span>{t('joined')}: {format.dateTime(new Date(player.joinDate), { dateStyle: 'long' })}</span>
      </div>

      {/* Career stats */}
      <section className="mt-8">
        <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('careerStats')}</h2>
        <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {[
            { label: t('goals'), value: player.goals },
            { label: t('matchesPlayed'), value: player.matchesPlayed },
            { label: t('wins'), value: player.wins },
            { label: t('draws'), value: player.draws },
            { label: t('losses'), value: player.losses },
            { label: t('winRate'), value: `${winRate(player.wins, player.matchesPlayed, player.draws)}%` },
          ].map((stat) => (
            <div key={stat.label} className="card-surface p-4 text-center">
              <div className="font-display text-xl font-bold text-gold-300">{stat.value}</div>
              <div className="mt-1 text-[10px] uppercase tracking-wide text-gold-100/40">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Visual stats */}
      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section className="card-surface flex flex-col items-center p-6">
          <h2 className="mb-4 self-start font-display text-lg font-bold text-gold-200">{t('resultBreakdown')}</h2>
          <CareerResultDonut wins={player.wins} draws={player.draws} losses={player.losses} />
        </section>
        <section className="card-surface p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('careerVsSeason')}</h2>
          <CareerVsSeasonBars
            career={{ matchesPlayed: player.matchesPlayed, goals: player.goals, wins: player.wins, draws: player.draws }}
            season={{
              matchesPlayed: player.seasonMatchesPlayed,
              goalsFor: player.seasonGoalsFor,
              wins: player.seasonWins,
              winPct: player.seasonWinPct,
            }}
          />
        </section>
      </div>

      <section className="card-surface mt-6 p-6">
        <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('statsTrend')}</h2>
        <StatTrendChart snapshots={statHistory} />
      </section>

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        {/* Squad */}
        <section className="card-surface p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('squad')}</h2>
          {squad.length > 0 ? (
            <ul className="flex flex-wrap gap-2">
              {squad.map((card, i) => (
                <li
                  key={i}
                  className="rounded-full border border-gold-400/25 bg-ink-800 px-3 py-1.5 text-sm text-gold-100/80"
                >
                  {card}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gold-100/40">{t('noSquad')}</p>
          )}
        </section>

        {/* Favorite player */}
        <section className="card-surface p-6">
          <h2 className="mb-4 font-display text-lg font-bold text-gold-200">{t('favoritePlayer')}</h2>
          {player.favoritePlayer ? (
            <div className="flex items-center gap-4">
              <div
                className={`relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl ${
                  player.favoritePlayerImage ? 'ring-1 ring-gold-400/40' : 'bg-gold-400/10'
                }`}
              >
                <PlayerPhoto
                  photoUrl={player.favoritePlayerImage}
                  name={player.favoritePlayer}
                  sizes="64px"
                  fallbackClassName="text-xl text-gold-400"
                />
              </div>
              <div className="font-display text-xl font-bold text-gold-100">{player.favoritePlayer}</div>
            </div>
          ) : (
            <p className="text-sm text-gold-100/40">{t('noFavorite')}</p>
          )}
        </section>
      </div>

      {player.bio && (
        <section className="card-surface mt-6 p-6">
          <h2 className="mb-3 font-display text-lg font-bold text-gold-200">{t('bio')}</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-gold-100/70">{player.bio}</p>
        </section>
      )}
    </div>
  );
}
