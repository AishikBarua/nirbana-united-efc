'use client';

/**
 * Admin fixtures UI for a single tournament — lets an admin manually pair
 * registered members into fixtures (see the TournamentMatch model's own
 * comment for why this is hand-entered rather than auto-generated bracket
 * generation, which is still a later feature), group them into rounds,
 * set one shared "match day" date/time for a whole round at once, and
 * download a branded fixture-card graphic for that round.
 */

import { useMemo, useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import type { TournamentMatch, TournamentRegistration } from '@prisma/client';
import DeleteButton from '@/components/admin/DeleteButton';
import TournamentFixtureCard, { type TournamentFixtureCardData } from '@/components/admin/TournamentFixtureCard';

function toDateTimeLocal(date: Date | string): string {
  const d = new Date(date);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface FixtureFormState {
  round: string;
  roundLabel: string;
  homeInGameId: string;
  awayInGameId: string;
  homeScore: string;
  awayScore: string;
  status: string;
}

function emptyForm(defaultRound: number): FixtureFormState {
  return {
    round: String(defaultRound),
    roundLabel: '',
    homeInGameId: '',
    awayInGameId: '',
    homeScore: '',
    awayScore: '',
    status: 'SCHEDULED',
  };
}

function formFromMatch(m: TournamentMatch): FixtureFormState {
  return {
    round: String(m.round),
    roundLabel: m.roundLabel ?? '',
    homeInGameId: m.homeInGameId,
    awayInGameId: m.awayInGameId,
    homeScore: m.homeScore != null ? String(m.homeScore) : '',
    awayScore: m.awayScore != null ? String(m.awayScore) : '',
    status: m.status,
  };
}

// Defined at module scope (not inside TournamentFixtureBoard) so it keeps a
// stable component identity across re-renders — nesting it inside the
// parent would give React a brand-new function/type on every render,
// forcing an unmount/remount of every <select> on each keystroke anywhere
// else in the form.
function PlayerSelect({
  registrations,
  value,
  onChange,
  placeholder,
}: {
  registrations: TournamentRegistration[];
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <select required className="input-field" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{placeholder}</option>
      {registrations.map((r) => (
        <option key={r.id} value={r.inGameId}>
          {r.playerName}
        </option>
      ))}
    </select>
  );
}

interface Props {
  tournamentId: string;
  tournamentName: string;
  crestUrl: string;
  siteHost: string;
  registrations: TournamentRegistration[];
  matches: TournamentMatch[];
}

export default function TournamentFixtureBoard({ tournamentId, tournamentName, crestUrl, siteHost, registrations, matches }: Props) {
  const t = useTranslations('admin.tournaments');
  const tc = useTranslations('common');
  const router = useRouter();

  const rounds = useMemo(() => {
    const map = new Map<number, TournamentMatch[]>();
    for (const m of matches) {
      if (!map.has(m.round)) map.set(m.round, []);
      map.get(m.round)!.push(m);
    }
    return Array.from(map.entries()).sort((a, b) => a[0] - b[0]);
  }, [matches]);

  const nextRound = rounds.length ? rounds[rounds.length - 1][0] : 1;

  const [addForm, setAddForm] = useState<FixtureFormState>(() => emptyForm(nextRound));
  const [addError, setAddError] = useState<string | null>(null);
  const [addSaving, setAddSaving] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<FixtureFormState | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);

  const [scheduleDrafts, setScheduleDrafts] = useState<Record<number, string>>({});
  const [schedulingRound, setSchedulingRound] = useState<number | null>(null);

  const [downloadCard, setDownloadCard] = useState<TournamentFixtureCardData | null>(null);

  function setAdd<K extends keyof FixtureFormState>(key: K, value: FixtureFormState[K]) {
    setAddForm((f) => ({ ...f, [key]: value }));
  }

  function setEdit<K extends keyof FixtureFormState>(key: K, value: FixtureFormState[K]) {
    setEditForm((f) => (f ? { ...f, [key]: value } : f));
  }

  function payloadFrom(form: FixtureFormState) {
    return {
      round: Number(form.round),
      roundLabel: form.roundLabel || null,
      homeInGameId: form.homeInGameId,
      awayInGameId: form.awayInGameId,
      homeScore: form.homeScore === '' ? null : Number(form.homeScore),
      awayScore: form.awayScore === '' ? null : Number(form.awayScore),
      status: form.status,
    };
  }

  async function handleAddFixture(e: FormEvent) {
    e.preventDefault();
    if (!addForm.homeInGameId || !addForm.awayInGameId) {
      setAddError(t('fixturePickBothPlayers'));
      return;
    }
    if (addForm.homeInGameId === addForm.awayInGameId) {
      setAddError(t('fixtureSamePlayer'));
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(addForm)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setAddError(typeof body?.error === 'string' ? body.error : tc('error'));
        return;
      }
      setAddForm((f) => emptyForm(Number(f.round)));
      router.refresh();
    } catch {
      setAddError(tc('error'));
    } finally {
      setAddSaving(false);
    }
  }

  function startEdit(m: TournamentMatch) {
    setEditingId(m.id);
    setEditForm(formFromMatch(m));
    setEditError(null);
  }

  async function handleUpdateFixture(e: FormEvent, matchId: string) {
    e.preventDefault();
    if (!editForm) return;
    if (editForm.homeInGameId === editForm.awayInGameId) {
      setEditError(t('fixtureSamePlayer'));
      return;
    }
    setEditSaving(true);
    setEditError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payloadFrom(editForm)),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        setEditError(typeof body?.error === 'string' ? body.error : tc('error'));
        return;
      }
      setEditingId(null);
      setEditForm(null);
      router.refresh();
    } catch {
      setEditError(tc('error'));
    } finally {
      setEditSaving(false);
    }
  }

  function scheduledAtFor(round: number, roundMatches: TournamentMatch[]): string {
    if (scheduleDrafts[round] !== undefined) return scheduleDrafts[round];
    const first = roundMatches[0]?.scheduledAt;
    return first ? toDateTimeLocal(first) : '';
  }

  async function handleScheduleRound(round: number, roundMatches: TournamentMatch[]) {
    const value = scheduledAtFor(round, roundMatches);
    if (!value) return;
    setSchedulingRound(round);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/fixtures/schedule`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ round, scheduledAt: value }),
      });
      if (res.ok) {
        setScheduleDrafts((d) => {
          const next = { ...d };
          delete next[round];
          return next;
        });
        router.refresh();
      } else {
        alert(tc('error'));
      }
    } catch {
      alert(tc('error'));
    } finally {
      setSchedulingRound(null);
    }
  }

  function openDownloadCard(round: number, roundLabel: string | null, scheduledAt: Date | string | null, roundMatches: TournamentMatch[]) {
    setDownloadCard({
      tournamentName,
      round,
      roundLabel,
      scheduledAt,
      crestUrl,
      siteHost,
      matches: roundMatches.map((m) => ({
        id: m.id,
        homePlayerName: m.homePlayerName,
        awayPlayerName: m.awayPlayerName,
        homeScore: m.homeScore,
        awayScore: m.awayScore,
        status: m.status,
      })),
    });
  }

  const sortedRegistrations = useMemo(
    () => [...registrations].sort((a, b) => a.playerName.localeCompare(b.playerName)),
    [registrations]
  );
  const selectPlaceholder = t('selectPlayer');

  return (
    <div>
      <h2 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-wide text-gold-200">{t('fixturesTitle')}</h2>

      {sortedRegistrations.length < 2 ? (
        <p className="card-surface p-4 text-center text-sm text-gold-100/40">{t('needTwoRegistrants')}</p>
      ) : (
        <form onSubmit={handleAddFixture} className="card-surface mb-6 space-y-4 p-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label-field">{t('round')}</label>
              <input
                required
                type="number"
                min={1}
                className="input-field"
                value={addForm.round}
                onChange={(e) => setAdd('round', e.target.value)}
              />
            </div>
            <div>
              <label className="label-field">{t('roundLabel')}</label>
              <input className="input-field" value={addForm.roundLabel} onChange={(e) => setAdd('roundLabel', e.target.value)} placeholder={t('roundLabelPlaceholder')} />
            </div>
            <div>
              <label className="label-field">{t('homePlayer')}</label>
              <PlayerSelect registrations={sortedRegistrations} placeholder={selectPlaceholder} value={addForm.homeInGameId} onChange={(v) => setAdd('homeInGameId', v)} />
            </div>
            <div>
              <label className="label-field">{t('awayPlayer')}</label>
              <PlayerSelect registrations={sortedRegistrations} placeholder={selectPlaceholder} value={addForm.awayInGameId} onChange={(v) => setAdd('awayInGameId', v)} />
            </div>
            <div>
              <label className="label-field">{t('matchStatus')}</label>
              <select className="input-field" value={addForm.status} onChange={(e) => setAdd('status', e.target.value)}>
                <option value="SCHEDULED">{t('matchScheduled')}</option>
                <option value="COMPLETED">{t('matchCompleted')}</option>
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label-field">{t('homeScore')}</label>
                <input type="number" min={0} className="input-field" value={addForm.homeScore} onChange={(e) => setAdd('homeScore', e.target.value)} />
              </div>
              <div>
                <label className="label-field">{t('awayScore')}</label>
                <input type="number" min={0} className="input-field" value={addForm.awayScore} onChange={(e) => setAdd('awayScore', e.target.value)} />
              </div>
            </div>
          </div>

          {addError && <p className="text-sm text-signal-red">{addError}</p>}

          <button type="submit" disabled={addSaving} className="btn-primary disabled:opacity-60">
            {addSaving ? '…' : t('addFixture')}
          </button>
        </form>
      )}

      {rounds.length === 0 && <p className="card-surface p-4 text-center text-sm text-gold-100/40">{t('noFixturesYet')}</p>}

      <div className="flex flex-col gap-6">
        {rounds.map(([round, roundMatches]) => {
          const roundLabel = roundMatches.find((m) => m.roundLabel)?.roundLabel ?? null;
          const scheduledValue = scheduledAtFor(round, roundMatches);
          const currentScheduledAt = roundMatches[0]?.scheduledAt ?? null;

          return (
            <div key={round} className="card-surface p-4">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-sm font-bold text-gold-200">
                  {t('round')} {round}
                  {roundLabel ? ` · ${roundLabel}` : ''}
                </h3>
                <button
                  type="button"
                  className="btn-secondary text-xs"
                  onClick={() => openDownloadCard(round, roundLabel, currentScheduledAt, roundMatches)}
                >
                  {t('downloadFixtureCard')}
                </button>
              </div>

              <div className="mb-4 flex flex-col gap-2">
                {roundMatches.map((m) =>
                  editingId === m.id && editForm ? (
                    <form key={m.id} onSubmit={(e) => handleUpdateFixture(e, m.id)} className="rounded-md border border-gold-400/20 bg-ink-900/40 p-3 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label-field">{t('round')}</label>
                          <input required type="number" min={1} className="input-field" value={editForm.round} onChange={(e) => setEdit('round', e.target.value)} />
                        </div>
                        <div>
                          <label className="label-field">{t('roundLabel')}</label>
                          <input className="input-field" value={editForm.roundLabel} onChange={(e) => setEdit('roundLabel', e.target.value)} />
                        </div>
                        <div>
                          <label className="label-field">{t('homePlayer')}</label>
                          <PlayerSelect registrations={sortedRegistrations} placeholder={selectPlaceholder} value={editForm.homeInGameId} onChange={(v) => setEdit('homeInGameId', v)} />
                        </div>
                        <div>
                          <label className="label-field">{t('awayPlayer')}</label>
                          <PlayerSelect registrations={sortedRegistrations} placeholder={selectPlaceholder} value={editForm.awayInGameId} onChange={(v) => setEdit('awayInGameId', v)} />
                        </div>
                        <div>
                          <label className="label-field">{t('matchStatus')}</label>
                          <select className="input-field" value={editForm.status} onChange={(e) => setEdit('status', e.target.value)}>
                            <option value="SCHEDULED">{t('matchScheduled')}</option>
                            <option value="COMPLETED">{t('matchCompleted')}</option>
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="label-field">{t('homeScore')}</label>
                            <input type="number" min={0} className="input-field" value={editForm.homeScore} onChange={(e) => setEdit('homeScore', e.target.value)} />
                          </div>
                          <div>
                            <label className="label-field">{t('awayScore')}</label>
                            <input type="number" min={0} className="input-field" value={editForm.awayScore} onChange={(e) => setEdit('awayScore', e.target.value)} />
                          </div>
                        </div>
                      </div>

                      {editError && <p className="text-sm text-signal-red">{editError}</p>}

                      <div className="flex gap-2">
                        <button type="submit" disabled={editSaving} className="btn-primary text-xs disabled:opacity-60">
                          {editSaving ? '…' : tc('save')}
                        </button>
                        <button type="button" className="btn-secondary text-xs" onClick={() => { setEditingId(null); setEditForm(null); }}>
                          {tc('cancel')}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <div key={m.id} className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-gold-400/10 bg-ink-900/30 p-3">
                      <div className="text-sm text-gold-100/80">
                        <span className="font-semibold">{m.homePlayerName}</span>
                        <span className="mx-2 text-gold-100/40">{t('vsLabel')}</span>
                        <span className="font-semibold">{m.awayPlayerName}</span>
                        {m.status === 'COMPLETED' && m.homeScore != null && m.awayScore != null ? (
                          <span className="ml-3 rounded-full border border-gold-400/30 px-2 py-0.5 text-xs font-bold text-gold-200">
                            {m.homeScore} - {m.awayScore}
                          </span>
                        ) : (
                          <span className="ml-3 text-[11px] uppercase tracking-wide text-gold-100/40">{t('matchScheduled')}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="btn-secondary text-xs" onClick={() => startEdit(m)}>
                          {tc('edit')}
                        </button>
                        <DeleteButton endpoint={`/api/tournaments/${tournamentId}/matches/${m.id}`} />
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="flex flex-wrap items-end gap-3 border-t border-gold-400/10 pt-3">
                <div className="flex-1">
                  <label className="label-field">{t('matchDay')}</label>
                  <input
                    type="datetime-local"
                    className="input-field"
                    value={scheduledValue}
                    onChange={(e) => setScheduleDrafts((d) => ({ ...d, [round]: e.target.value }))}
                  />
                  <p className="mt-1 text-xs text-gold-100/40">
                    {currentScheduledAt ? t('matchDayCurrentlySet') : t('matchDayHint')}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={schedulingRound === round || !scheduledValue}
                  onClick={() => handleScheduleRound(round, roundMatches)}
                  className="btn-primary text-sm disabled:opacity-60"
                >
                  {schedulingRound === round ? '…' : t('setMatchDay')}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {downloadCard && <TournamentFixtureCard data={downloadCard} onClose={() => setDownloadCard(null)} />}
    </div>
  );
}
