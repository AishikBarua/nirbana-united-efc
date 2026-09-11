'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';

type SyncSummary = {
  players: number;
  matches: number;
  fixtures: number;
  transfers: number;
  rankings: number;
  officialRecord: { played: number; wins: number; draws: number; losses: number; gf: number; ga: number };
};

type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; summary: SyncSummary }
  | { status: 'problems'; problems: string[] }
  | { status: 'error'; message: string };

// Ticks the "Last synced: X ago" text forward once a minute so it stays
// accurate for an admin who leaves the dashboard open, without any polling —
// this is purely a display refresh, not a re-fetch.
const RELATIVE_TIME_TICK_MS = 60 * 1000;

export default function SyncTrackerButton({ initialLastSyncedAt }: { initialLastSyncedAt: string | null }) {
  const t = useTranslations('admin.dashboard.sync');
  const locale = useLocale();
  const [state, setState] = useState<State>({ status: 'idle' });
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(initialLastSyncedAt);
  const [, forceTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => forceTick((n) => n + 1), RELATIVE_TIME_TICK_MS);
    return () => clearInterval(interval);
  }, []);

  function relativeTime(iso: string) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (Math.abs(diffMin) < 1) return t('justNow');
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    return rtf.format(Math.round(diffHr / 24), 'day');
  }

  async function runSync() {
    setState({ status: 'loading' });
    try {
      const res = await fetch('/api/admin/sync-tracker', { method: 'POST' });
      const data = await res.json();
      if (res.ok && data.ok) {
        setState({ status: 'success', summary: data.summary });
        setLastSyncedAt(new Date().toISOString());
      } else if (Array.isArray(data.problems)) {
        setState({ status: 'problems', problems: data.problems });
      } else {
        setState({ status: 'error', message: t('genericError') });
      }
    } catch {
      setState({ status: 'error', message: t('genericError') });
    }
  }

  return (
    <div className="card-surface p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-lg font-bold text-gold-200">{t('title')}</div>
          <p className="mt-1 max-w-xl text-sm text-gold-100/60">{t('description')}</p>
          <p className="mt-2 text-xs font-semibold text-signal-teal">
            {lastSyncedAt ? t('lastSynced', { time: relativeTime(lastSyncedAt) }) : t('neverSynced')}
          </p>
        </div>
        <button
          type="button"
          onClick={runSync}
          disabled={state.status === 'loading'}
          className="btn-primary whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-60"
        >
          {state.status === 'loading' ? t('buttonLoading') : t('button')}
        </button>
      </div>

      {state.status === 'success' && (
        <div className="mt-4 rounded-lg border border-signal-green/30 bg-signal-green/10 p-4 text-sm text-signal-green">
          <div className="font-semibold">{t('successTitle')}</div>
          <p className="mt-1 text-signal-green/90">
            {t('successBody', {
              players: state.summary.players,
              matches: state.summary.matches,
              fixtures: state.summary.fixtures,
              transfers: state.summary.transfers,
              rankings: state.summary.rankings,
            })}
          </p>
        </div>
      )}

      {state.status === 'problems' && (
        <div className="mt-4 rounded-lg border border-gold-400/30 bg-gold-400/10 p-4 text-sm text-gold-200">
          <div className="font-semibold">{t('problemsTitle')}</div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-gold-200/80">
            {state.problems.map((p, i) => (
              <li key={i}>{p}</li>
            ))}
          </ul>
          <p className="mt-2 text-gold-200/60">{t('problemsNote')}</p>
        </div>
      )}

      {state.status === 'error' && (
        <div className="mt-4 rounded-lg border border-signal-red/30 bg-signal-red/10 p-4 text-sm text-signal-red">
          {state.message}
        </div>
      )}

      <p className="mt-4 text-xs text-gold-100/40">{t('preserves')}</p>
    </div>
  );
}
