'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

export default function DeleteButton({ endpoint }: { endpoint: string }) {
  const t = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleDelete() {
    if (!confirm(t('confirmDelete'))) return;
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'DELETE' });
      if (res.ok) {
        router.refresh();
      } else {
        alert(t('error'));
      }
    } catch {
      alert(t('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDelete}
      disabled={loading}
      className="rounded-md border border-signal-red/30 px-3 py-1.5 text-xs font-semibold text-signal-red transition hover:bg-signal-red/10 disabled:opacity-50"
    >
      {t('delete')}
    </button>
  );
}
