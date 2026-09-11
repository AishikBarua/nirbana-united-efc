'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import { parseJsonArray } from '@/lib/utils';
import type { ClubInfo } from '@prisma/client';

export default function ClubInfoForm({ info }: { info: ClubInfo | null }) {
  const t = useTranslations('admin.club');
  const tc = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState({
    clubName: info?.clubName || 'Nirbana United EFC',
    tagline: info?.tagline || 'Meditate. Dominate. Celebrate.',
    founded: info?.founded || '',
    history: info?.history || '',
    achievements: info ? parseJsonArray(info.achievementsJson).join('\n') : '',
  });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const payload = {
      ...form,
      achievements: form.achievements
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch('/api/club', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }
      setSaved(true);
      router.refresh();
    } catch {
      setError(tc('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field">{t('clubName')}</label>
          <input required className="input-field" value={form.clubName} onChange={(e) => set('clubName', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('founded')}</label>
          <input className="input-field" value={form.founded} onChange={(e) => set('founded', e.target.value)} />
        </div>
      </div>
      <div>
        <label className="label-field">{t('tagline')}</label>
        <input className="input-field" value={form.tagline} onChange={(e) => set('tagline', e.target.value)} />
      </div>
      <div>
        <label className="label-field">{t('history')}</label>
        <textarea rows={8} className="input-field" value={form.history} onChange={(e) => set('history', e.target.value)} />
      </div>
      <div>
        <label className="label-field">{t('achievements')}</label>
        <textarea rows={5} className="input-field" value={form.achievements} onChange={(e) => set('achievements', e.target.value)} />
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {saved && <p className="text-sm text-signal-green">{tc('success')}</p>}

      <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
        {saving ? '…' : tc('save')}
      </button>
    </form>
  );
}
