'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

/**
 * Status-change buttons for the tournament manage page. Deliberately only
 * exposes the transitions that are actually meaningful before fixture
 * generation exists (a later feature) — REGISTRATION_OPEN <-> CLOSED, and
 * CANCELLED as an escape hatch from either. "Mark In Progress" /
 * "Mark Completed" aren't shown yet since there'd be nothing behind them
 * (see tournamentService.ts's ALLOWED_STATUS_TRANSITIONS for the full set
 * the API already accepts).
 */
export default function TournamentStatusActions({ tournamentId, status }: { tournamentId: string; status: string }) {
  const t = useTranslations('admin.tournaments');
  const tc = useTranslations('common');
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function changeStatus(nextStatus: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
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

  if (status === 'COMPLETED' || status === 'CANCELLED') return null;

  return (
    <div className="flex flex-wrap gap-2">
      {status === 'REGISTRATION_OPEN' && (
        <button type="button" disabled={loading} onClick={() => changeStatus('REGISTRATION_CLOSED')} className="btn-secondary text-sm disabled:opacity-60">
          {t('closeRegistration')}
        </button>
      )}
      {status === 'REGISTRATION_CLOSED' && (
        <button type="button" disabled={loading} onClick={() => changeStatus('REGISTRATION_OPEN')} className="btn-secondary text-sm disabled:opacity-60">
          {t('reopenRegistration')}
        </button>
      )}
      <button
        type="button"
        disabled={loading}
        onClick={() => {
          if (confirm(t('cancelConfirm'))) changeStatus('CANCELLED');
        }}
        className="rounded-md border border-signal-red/30 px-3 py-1.5 text-xs font-semibold text-signal-red transition hover:bg-signal-red/10 disabled:opacity-50"
      >
        {t('cancelTournament')}
      </button>
    </div>
  );
}
