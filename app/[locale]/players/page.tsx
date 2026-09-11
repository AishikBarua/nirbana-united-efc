import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import SectionHeading from '@/components/SectionHeading';
import PlayerCard from '@/components/PlayerCard';
import RosterFilters from '@/components/RosterFilters';
import { listPlayers, listPlayerFilterOptions } from '@/lib/services/playerService';

export default async function PlayersPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { sort?: string; position?: string; division?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('players');

  const [players, { positions, divisions }] = await Promise.all([
    listPlayers({ position: searchParams.position, division: searchParams.division, sort: searchParams.sort }),
    listPlayerFilterOptions(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading eyebrow={t('subtitle')} title={t('title')} />
      <RosterFilters positions={positions} divisions={divisions} />

      {players.length > 0 ? (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gold-100/50">{t('noPlayers')}</p>
      )}
    </div>
  );
}
