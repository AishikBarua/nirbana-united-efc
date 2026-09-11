import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import AdminNav from '@/components/admin/AdminNav';
import MatchForm from '@/components/admin/MatchForm';

export default async function NewMatchPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.matches');

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('newMatch')}</h1>
        <MatchForm />
      </div>
    </div>
  );
}
