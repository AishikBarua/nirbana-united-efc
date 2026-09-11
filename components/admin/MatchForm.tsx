'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import type { Match } from '@prisma/client';

function toDateTimeLocal(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function MatchForm({ match }: { match?: Match }) {
  const t = useTranslations('admin.matches');
  const tc = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState({
    opponent: match?.opponent || '',
    date: match ? toDateTimeLocal(match.date) : toDateTimeLocal(new Date()),
    status: match?.status || 'UPCOMING',
    ourScore: match?.ourScore ?? '',
    opponentScore: match?.opponentScore ?? '',
    competition: match?.competition || '',
    notes: match?.notes || '',
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

    const payload = {
      ...form,
      ourScore: form.ourScore === '' ? null : Number(form.ourScore),
      opponentScore: form.opponentScore === '' ? null : Number(form.opponentScore),
    };

    try {
      const res = await fetch(match ? `/api/matches/${match.id}` : '/api/matches', {
        method: match ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }
      router.push('/admin/matches');
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
          <label className="label-field">{t('opponent')}</label>
          <input required className="input-field" value={form.opponent} onChange={(e) => set('opponent', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('date')}</label>
          <input required type="datetime-local" className="input-field" value={form.date} onChange={(e) => set('date', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('status')}</label>
          <select className="input-field" value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="UPCOMING">{t('upcoming')}</option>
            <option value="COMPLETED">{t('completed')}</option>
          </select>
        </div>
        <div>
          <label className="label-field">{t('competition')}</label>
          <input className="input-field" value={form.competition} onChange={(e) => set('competition', e.target.value)} placeholder="e.g. Weekly League" />
        </div>
        <div>
          <label className="label-field">{t('ourScore')}</label>
          <input type="number" min={0} className="input-field" value={form.ourScore} onChange={(e) => set('ourScore', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('opponentScore')}</label>
          <input type="number" min={0} className="input-field" value={form.opponentScore} onChange={(e) => set('opponentScore', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="label-field">{t('notes')}</label>
        <textarea rows={3} className="input-field" value={form.notes} onChange={(e) => set('notes', e.target.value)} />
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? '…' : tc('save')}
        </button>
        <button type="button" onClick={() => router.push('/admin/matches')} className="btn-secondary">
          {tc('cancel')}
        </button>
      </div>
    </form>
  );
}
