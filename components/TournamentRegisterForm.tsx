'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useTranslations } from 'next-intl';

interface PlayerOption {
  id: string;
  name: string;
}

/**
 * The tournament sign-up form. There are no visitor accounts on this site,
 * so — same as CommentBox's "@yourname" picker — a club member identifies
 * themselves by picking their own name from the current roster rather than
 * logging in. That alone isn't enough to keep an outsider who stumbles on
 * this public page from registering, though, so a second gate is required:
 * the tournament's own access code, handed out to real members by the
 * admin outside the site (WhatsApp, Discord, etc.). Both are checked
 * server-side in app/api/tournaments/[id]/register/route.ts.
 */
export default function TournamentRegisterForm({ tournamentId }: { tournamentId: string }) {
  const t = useTranslations('tournaments');

  const [players, setPlayers] = useState<PlayerOption[]>([]);
  const [nameQuery, setNameQuery] = useState('');
  const [selected, setSelected] = useState<PlayerOption | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const [accessCode, setAccessCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetch('/api/players')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (Array.isArray(data)) {
          setPlayers(data.map((p) => ({ id: (p as { id: string }).id, name: (p as { name: string }).name })));
        }
      })
      .catch(() => setPlayers([]));
  }, []);

  const filteredPlayers = (
    nameQuery.trim() ? players.filter((p) => p.name.toLowerCase().includes(nameQuery.trim().toLowerCase())) : players
  ).slice(0, 8);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!selected) {
      setError(t('pickNameFirst'));
      return;
    }
    if (!accessCode.trim()) {
      setError(t('enterCodeFirst'));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ playerId: selected.id, accessCode }),
      });

      if (res.status === 429) {
        setError(t('tooManyAttempts'));
        return;
      }
      if (res.status === 403) {
        setError(t('invalidCode'));
        return;
      }
      if (res.status === 409) {
        setError(t('alreadyRegistered'));
        return;
      }
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        setError((data && typeof data.error === 'string' && data.error) || t('genericError'));
        return;
      }

      setSubmitted(true);
    } catch {
      setError(t('genericError'));
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return <p className="card-surface p-4 text-sm text-signal-green">{t('registeredNotice')}</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-3 p-4">
      <div className="relative">
        <label className="label-field" htmlFor={`tournamentPlayer-${tournamentId}`}>
          {t('yourName')}
        </label>
        <input
          id={`tournamentPlayer-${tournamentId}`}
          type="text"
          className="input-field"
          placeholder={t('namePlaceholder')}
          value={selected ? `@${selected.name}` : nameQuery}
          onChange={(e) => {
            setSelected(null);
            setNameQuery(e.target.value.replace(/^@/, ''));
            setShowDropdown(true);
          }}
          onFocus={() => setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 150)}
          autoComplete="off"
        />
        {showDropdown && !selected && filteredPlayers.length > 0 && (
          <ul className="absolute z-10 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-gold-400/20 bg-ink-900 shadow-card">
            {filteredPlayers.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  className="block w-full px-3 py-2 text-left text-sm text-gold-100/80 hover:bg-gold-400/10"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    setSelected(p);
                    setNameQuery('');
                    setShowDropdown(false);
                  }}
                >
                  @{p.name}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div>
        <label className="label-field" htmlFor={`tournamentCode-${tournamentId}`}>
          {t('accessCodeLabel')}
        </label>
        <input
          id={`tournamentCode-${tournamentId}`}
          type="text"
          className="input-field font-mono uppercase tracking-widest"
          placeholder={t('accessCodePlaceholder')}
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
        />
        <p className="mt-1 text-xs text-gold-100/40">{t('accessCodeAskHint')}</p>
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <button type="submit" disabled={submitting} className="btn-primary disabled:opacity-60">
        {submitting ? '…' : t('register')}
      </button>
    </form>
  );
}
