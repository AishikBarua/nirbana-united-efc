import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getMatch } from '@/lib/services/matchService';
import AdminNav from '@/components/admin/AdminNav';
import MatchForm from '@/components/admin/MatchForm';

export default async function EditMatchPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.matches');
  const match = await getMatch(id);
  if (!match) notFound();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('editMatch')}</h1>
        <MatchForm match={match} />
      </div>
    </div>
  );
}
