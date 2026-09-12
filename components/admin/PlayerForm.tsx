'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import ImageUploadField from './ImageUploadField';
import type { Player } from '@prisma/client';
import { parseJsonArray } from '@/lib/utils';

function toDateInputValue(date: Date | string): string {
  const d = new Date(date);
  return d.toISOString().slice(0, 10);
}

export default function PlayerForm({ player }: { player?: Player }) {
  const t = useTranslations('admin.players');
  const tc = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState({
    name: player?.name || '',
    inGameId: player?.inGameId || '',
    photoUrl: player?.photoUrl || '',
    joinDate: player ? toDateInputValue(player.joinDate) : toDateInputValue(new Date()),
    position: player?.position || '',
    divisionRank: player?.divisionRank || '',
    goals: player?.goals ?? 0,
    matchesPlayed: player?.matchesPlayed ?? 0,
    wins: player?.wins ?? 0,
    draws: player?.draws ?? 0,
    losses: player?.losses ?? 0,
    squad: player ? parseJsonArray(player.squadJson).join(', ') : '',
    favoritePlayer: player?.favoritePlayer || '',
    favoritePlayerImage: player?.favoritePlayerImage || '',
    bio: player?.bio || '',
    featured: player?.featured ?? false,
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
      squad: form.squad
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    try {
      const res = await fetch(player ? `/api/players/${player.id}` : '/api/players', {
        method: player ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }
      router.push('/admin/players');
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
          <label className="label-field">{t('name')}</label>
          <input required className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('inGameId')}</label>
          <input required className="input-field" value={form.inGameId} onChange={(e) => set('inGameId', e.target.value)} />
        </div>
        <div>
          <label className="label-field">{t('position')}</label>
          <input required className="input-field" value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="e.g. Striker" />
        </div>
        <div>
          <label className="label-field">{t('divisionRank')}</label>
          <input required className="input-field" value={form.divisionRank} onChange={(e) => set('divisionRank', e.target.value)} placeholder="e.g. #6576 or Unranked" />
        </div>
        <div>
          <label className="label-field">{t('joinDate')}</label>
          <input required type="date" className="input-field" value={form.joinDate} onChange={(e) => set('joinDate', e.target.value)} />
        </div>
        <div className="flex items-center gap-2 pt-6">
          <input
            id="featured"
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set('featured', e.target.checked)}
            className="h-4 w-4 rounded border-gold-400/40 bg-ink-900 text-gold-400"
          />
          <label htmlFor="featured" className="text-sm text-gold-100/70">{t('featured')}</label>
        </div>
      </div>

      <ImageUploadField label={t('photoUrl')} value={form.photoUrl} onChange={(url) => set('photoUrl', url)} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
        {(['goals', 'matchesPlayed', 'wins', 'draws', 'losses'] as const).map((field) => (
          <div key={field}>
            <label className="label-field">{t(field)}</label>
            <input
              type="number"
              min={0}
              className="input-field"
              value={form[field]}
              onChange={(e) => set(field, Number(e.target.value))}
            />
          </div>
        ))}
      </div>

      <div>
        <label className="label-field">{t('squad')}</label>
        <input className="input-field" value={form.squad} onChange={(e) => set('squad', e.target.value)} placeholder="Messi, Haaland, Van Dijk" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label-field">{t('favoritePlayer')}</label>
          <input className="input-field" value={form.favoritePlayer} onChange={(e) => set('favoritePlayer', e.target.value)} />
        </div>
        <ImageUploadField
          label={t('favoritePlayerImage')}
          value={form.favoritePlayerImage}
          onChange={(url) => set('favoritePlayerImage', url)}
        />
      </div>

      <div>
        <label className="label-field">{t('bio')}</label>
        <textarea rows={3} className="input-field" value={form.bio} onChange={(e) => set('bio', e.target.value)} />
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? '…' : tc('save')}
        </button>
        <button type="button" onClick={() => router.push('/admin/players')} className="btn-secondary">
          {tc('cancel')}
        </button>
      </div>
    </form>
  );
}
