import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getStanding } from '@/lib/services/standingService';
import AdminNav from '@/components/admin/AdminNav';
import StandingForm from '@/components/admin/StandingForm';

export default async function EditStandingPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.standings');
  const standing = await getStanding(id);
  if (!standing) notFound();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('editRow')}</h1>
        <StandingForm standing={standing} />
      </div>
    </div>
  );
}
