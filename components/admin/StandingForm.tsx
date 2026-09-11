'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import type { Standing } from '@prisma/client';

export default function StandingForm({ standing }: { standing?: Standing }) {
  const t = useTranslations('admin.standings');
  const tc = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState({
    teamName: standing?.teamName || '',
    position: standing?.position ?? 1,
    points: standing?.points ?? 0,
    played: standing?.played ?? 0,
    won: standing?.won ?? 0,
    drawn: standing?.drawn ?? 0,
    lost: standing?.lost ?? 0,
    isUs: standing?.isUs ?? false,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(standing ? `/api/standings/${standing.id}` : '/api/standings', {
        method: standing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }
      router.push('/admin/standings');
      router.refresh();
    } catch {
      setError(tc('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6">
      <div>
        <label className="label-field">{t('teamName')}</label>
        <input required className="input-field" value={form.teamName} onChange={(e) => set('teamName', e.target.value)} />
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {(['position', 'points', 'played', 'won', 'drawn', 'lost'] as const).map((field) => (
          <div key={field}>
            <label className="label-field">{t(field)}</label>
            <input
              type="number"
              min={field === 'position' ? 1 : 0}
              className="input-field"
              value={form[field]}
              onChange={(e) => set(field, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isUs"
          type="checkbox"
          checked={form.isUs}
          onChange={(e) => set('isUs', e.target.checked)}
          className="h-4 w-4 rounded border-gold-400/40 bg-ink-900 text-gold-400"
        />
        <label htmlFor="isUs" className="text-sm text-gold-100/70">{t('isUs')}</label>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? '…' : tc('save')}
        </button>
        <button type="button" onClick={() => router.push('/admin/standings')} className="btn-secondary">
          {tc('cancel')}
        </button>
      </div>
    </form>
  );
}
