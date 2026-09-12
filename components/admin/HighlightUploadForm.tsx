'use client';

import { useState, FormEvent, useRef, useMemo } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

export interface HighlightPlayerOption {
  inGameId: string;
  name: string;
}

export interface HighlightMatchOption {
  id: string;
  opponent: string;
  date: string; // ISO string
  ourScore: number | null;
  opponentScore: number | null;
  competition: string | null;
}

const NO_MATCH = '__none__';

export default function HighlightUploadForm({
  players,
  matches,
}: {
  players: HighlightPlayerOption[];
  matches: HighlightMatchOption[];
}) {
  const t = useTranslations('admin.highlights');
  const tc = useTranslations('common');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [inGameId, setInGameId] = useState(players[0]?.inGameId ?? '');
  const [matchId, setMatchId] = useState(NO_MATCH);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const matchById = useMemo(() => new Map(matches.map((m) => [m.id, m])), [matches]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    const player = players.find((p) => p.inGameId === inGameId);
    if (!file || !player) {
      setError(t('missingFields'));
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error || tc('error'));
        return;
      }

      const match = matchId !== NO_MATCH ? matchById.get(matchId) : undefined;

      const res = await fetch('/api/highlights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          inGameId: player.inGameId,
          playerName: player.name,
          imageUrl: uploadData.url,
          caption,
          matchOpponent: match?.opponent ?? null,
          matchDate: match?.date ?? null,
          matchScore: match ? `${match.ourScore}-${match.opponentScore}` : null,
          matchCompetition: match?.competition ?? null,
        }),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }

      setCaption('');
      setMatchId(NO_MATCH);
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch {
      setError(tc('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label-field">{t('player')}</label>
        <select className="input-field" value={inGameId} onChange={(e) => setInGameId(e.target.value)}>
          {players.map((p) => (
            <option key={p.inGameId} value={p.inGameId}>
              {p.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-field">{t('taggedMatch')}</label>
        <select className="input-field" value={matchId} onChange={(e) => setMatchId(e.target.value)}>
          <option value={NO_MATCH}>{t('noMatchTag')}</option>
          {matches.map((m) => (
            <option key={m.id} value={m.id}>
              vs {m.opponent} — {new Date(m.date).toLocaleDateString()} ({m.ourScore}-{m.opponentScore})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label-field">{t('upload')}</label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm text-gold-100/70" />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="label-field">{t('caption')}</label>
        <input className="input-field" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      {error && <p className="w-full text-sm text-signal-red">{error}</p>}
      <button type="submit" disabled={saving || !players.length} className="btn-primary disabled:opacity-60">
        {saving ? '…' : tc('add')}
      </button>
    </form>
  );
}
