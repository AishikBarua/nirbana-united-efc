import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import AdminNav from '@/components/admin/AdminNav';
import PlayerForm from '@/components/admin/PlayerForm';

export default async function NewPlayerPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.players');

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('newPlayer')}</h1>
        <PlayerForm />
      </div>
    </div>
  );
}
