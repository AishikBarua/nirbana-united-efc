import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getPlayer } from '@/lib/services/playerService';
import AdminNav from '@/components/admin/AdminNav';
import PlayerForm from '@/components/admin/PlayerForm';

export default async function EditPlayerPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.players');
  const player = await getPlayer(id);
  if (!player) notFound();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('editPlayer')}</h1>
        <PlayerForm player={player} />
      </div>
    </div>
  );
}
