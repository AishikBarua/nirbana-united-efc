'use client';

import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

export default function LogoutButton() {
  const t = useTranslations('admin.dashboard');
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/admin/login');
    router.refresh();
  }

  return (
    <button type="button" onClick={handleLogout} className="btn-secondary text-sm">
      {t('logout')}
    </button>
  );
}
