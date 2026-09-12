import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';
import { winRate } from '@/lib/utils';
import PlayerPhoto from '@/components/PlayerPhoto';
import type { Player } from '@prisma/client';

export default function PlayerCard({ player }: { player: Player }) {
  const t = useTranslations('players');

  return (
    <Link
      href={`/players/${player.slug ?? player.id}`}
      className="card-surface group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-gold animate-rise"
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-ink-800">
        <PlayerPhoto
          photoUrl={player.photoUrl}
          name={player.name}
          sizes="(max-width: 640px) 100vw, 300px"
          imageClassName="transition duration-300 group-hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-ink-950/90 to-transparent" />
        <div className="absolute bottom-2 left-3 text-[11px] font-bold uppercase tracking-wide text-gold-300">
          {player.divisionRank}
        </div>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div>
          <div className="font-display text-lg font-bold text-gold-100">{player.name}</div>
          <div className="text-xs text-gold-100/50">@{player.inGameId} · {player.position}</div>
          {player.squadNumber && (
            <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wide text-gold-100/35">
              {player.squadNumber}
            </div>
          )}
        </div>

        <div className="mt-auto grid grid-cols-3 gap-2 border-t border-gold-400/10 pt-3 text-center">
          <div>
            <div className="font-display text-base font-bold text-gold-300">{player.goals}</div>
            <div className="text-[10px] uppercase tracking-wide text-gold-100/40">{t('goals')}</div>
          </div>
          <div>
            <div className="font-display text-base font-bold text-gold-300">{player.matchesPlayed}</div>
            <div className="text-[10px] uppercase tracking-wide text-gold-100/40">{t('matches')}</div>
          </div>
          <div>
            <div className="font-display text-base font-bold text-signal-teal">
              {winRate(player.wins, player.matchesPlayed, player.draws)}%
            </div>
            <div className="text-[10px] uppercase tracking-wide text-gold-100/40">{t('winRate')}</div>
          </div>
        </div>
      </div>
    </Link>
  );
}
