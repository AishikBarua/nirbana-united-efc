import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getClubInfo } from '@/lib/services/clubService';
import AdminNav from '@/components/admin/AdminNav';
import ClubInfoForm from '@/components/admin/ClubInfoForm';

export default async function AdminClubPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.club');
  const info = await getClubInfo();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
        <ClubInfoForm info={info} />
      </div>
    </div>
  );
}
