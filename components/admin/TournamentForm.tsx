'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import type { Tournament } from '@prisma/client';

function toDateTimeLocal(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** A short, easy-to-read-aloud random code (no ambiguous 0/O/1/I) — handed
 * out to real club members via WhatsApp/etc. so they can register. */
function generateAccessCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += alphabet[Math.floor(Math.random() * alphabet.length)];
  return code;
}

export default function TournamentForm({ tournament }: { tournament?: Tournament }) {
  const t = useTranslations('admin.tournaments');
  const tc = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState({
    name: tournament?.name || '',
    description: tournament?.description || '',
    accessCode: tournament?.accessCode || generateAccessCode(),
    registrationDeadline: tournament?.registrationDeadline ? toDateTimeLocal(tournament.registrationDeadline) : '',
    startDate: tournament?.startDate ? toDateTimeLocal(tournament.startDate) : '',
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
      const res = await fetch(tournament ? `/api/tournaments/${tournament.id}` : '/api/tournaments', {
        method: tournament ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          accessCode: form.accessCode,
          registrationDeadline: form.registrationDeadline || null,
          startDate: form.startDate || null,
        }),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }
      router.push('/admin/tournaments');
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
        <label className="label-field">{t('name')}</label>
        <input required className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} />
      </div>

      <div>
        <label className="label-field">{t('description')}</label>
        <textarea
          className="input-field min-h-[90px] resize-y"
          maxLength={3000}
          value={form.description}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <div>
        <label className="label-field">{t('accessCode')}</label>
        <div className="flex gap-2">
          <input
            required
            className="input-field font-mono uppercase tracking-widest"
            value={form.accessCode}
            onChange={(e) => set('accessCode', e.target.value)}
          />
          <button type="button" className="btn-secondary shrink-0 text-sm" onClick={() => set('accessCode', generateAccessCode())}>
            {t('generateCode')}
          </button>
        </div>
        <p className="mt-1 text-xs text-gold-100/40">{t('accessCodeHint')}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field">{t('registrationDeadline')}</label>
          <input
            type="datetime-local"
            className="input-field"
            value={form.registrationDeadline}
            onChange={(e) => set('registrationDeadline', e.target.value)}
          />
        </div>
        <div>
          <label className="label-field">{t('startDate')}</label>
          <input
            type="datetime-local"
            className="input-field"
            value={form.startDate}
            onChange={(e) => set('startDate', e.target.value)}
          />
        </div>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? '…' : tc('save')}
        </button>
        <button type="button" onClick={() => router.push('/admin/tournaments')} className="btn-secondary">
          {tc('cancel')}
        </button>
      </div>
    </form>
  );
}
