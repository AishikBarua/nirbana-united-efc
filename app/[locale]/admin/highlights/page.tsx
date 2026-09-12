import Image from 'next/image';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { listPlayers } from '@/lib/services/playerService';
import { listCompletedMatches } from '@/lib/services/matchService';
import { listAllHighlights } from '@/lib/services/highlightService';
import AdminNav from '@/components/admin/AdminNav';
import DeleteButton from '@/components/admin/DeleteButton';
import HighlightUploadForm from '@/components/admin/HighlightUploadForm';

export default async function AdminHighlightsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.highlights');

  const [players, matches, highlights] = await Promise.all([
    listPlayers(),
    listCompletedMatches(),
    listAllHighlights(),
  ]);

  const playerOptions = players.map((p) => ({ inGameId: p.inGameId, name: p.name }));
  const matchOptions = matches.map((m) => ({
    id: m.id,
    opponent: m.opponent,
    date: m.date.toISOString(),
    ourScore: m.ourScore,
    opponentScore: m.opponentScore,
    competition: m.competition,
  }));

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-2 font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
        <p className="mb-6 text-sm text-gold-100/50">{t('subtitle')}</p>

        <div className="mb-8">
          <HighlightUploadForm players={playerOptions} matches={matchOptions} />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {highlights.map((h) => (
            <div key={h.id} className="card-surface overflow-hidden">
              <div className="relative aspect-square w-full">
                <Image src={h.imageUrl} alt={h.caption || h.playerName} fill sizes="200px" className="object-cover" />
              </div>
              <div className="p-2">
                <div className="truncate text-xs font-semibold text-gold-200">{h.playerName}</div>
                {h.matchOpponent && (
                  <div className="truncate text-[11px] text-gold-100/40">
                    vs {h.matchOpponent} {h.matchScore ? `(${h.matchScore})` : ''}
                  </div>
                )}
                {h.caption && <div className="truncate text-[11px] text-gold-100/40">{h.caption}</div>}
                <div className="mt-1.5 flex justify-end">
                  <DeleteButton endpoint={`/api/highlights/${h.id}`} />
                </div>
              </div>
            </div>
          ))}
        </div>
        {highlights.length === 0 && <p className="text-sm text-gold-100/40">{t('noHighlights')}</p>}
      </div>
    </div>
  );
}
