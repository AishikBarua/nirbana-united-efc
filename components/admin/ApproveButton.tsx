'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

export default function ApproveButton({ endpoint }: { endpoint: string }) {
  const t = useTranslations('admin.comments');
  const tc = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleApprove() {
    setLoading(true);
    try {
      const res = await fetch(endpoint, { method: 'PUT' });
      if (res.ok) {
        router.refresh();
      } else {
        alert(tc('error'));
      }
    } catch {
      alert(tc('error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleApprove}
      disabled={loading}
      className="rounded-md border border-signal-green/30 px-3 py-1.5 text-xs font-semibold text-signal-green transition hover:bg-signal-green/10 disabled:opacity-50"
    >
      {t('approve')}
    </button>
  );
}
