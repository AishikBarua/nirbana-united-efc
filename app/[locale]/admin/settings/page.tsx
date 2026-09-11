import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import AdminNav from '@/components/admin/AdminNav';
import ChangePasswordForm from '@/components/admin/ChangePasswordForm';

export default async function AdminSettingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.settings');

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
        <p className="mt-1 text-sm text-gold-100/50">{t('subtitle')}</p>

        <div className="mt-6 card-surface p-6">
          <ChangePasswordForm />
        </div>
      </div>
    </div>
  );
}
