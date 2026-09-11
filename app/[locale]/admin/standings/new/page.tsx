import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import AdminNav from '@/components/admin/AdminNav';
import StandingForm from '@/components/admin/StandingForm';

export default async function NewStandingPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.standings');

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('newRow')}</h1>
        <StandingForm />
      </div>
    </div>
  );
}
