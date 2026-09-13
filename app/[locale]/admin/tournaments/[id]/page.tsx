import { notFound } from 'next/navigation';
import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { getTournament, listRegistrations } from '@/lib/services/tournamentService';
import AdminNav from '@/components/admin/AdminNav';
import TournamentForm from '@/components/admin/TournamentForm';
import TournamentStatusActions from '@/components/admin/TournamentStatusActions';
import DeleteButton from '@/components/admin/DeleteButton';

const STATUS_KEY: Record<string, string> = {
  REGISTRATION_OPEN: 'statusRegistrationOpen',
  REGISTRATION_CLOSED: 'statusRegistrationClosed',
  IN_PROGRESS: 'statusInProgress',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
};

export default async function ManageTournamentPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.tournaments');
  const format = await getFormatter();

  const tournament = await getTournament(id);
  if (!tournament) notFound();
  const registrations = await listRegistrations(id);

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-gold-100">{tournament.name}</h1>
          <span className="rounded-full border border-gold-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-200">
            {t(STATUS_KEY[tournament.status] ?? 'statusRegistrationOpen')}
          </span>
        </div>

        <div className="card-surface mb-6 flex flex-wrap items-center justify-between gap-3 p-4">
          <TournamentStatusActions tournamentId={tournament.id} status={tournament.status} />
          <p className="text-xs text-gold-100/40">{t('deleteFromListHint')}</p>
        </div>

        <div className="card-surface mb-6 flex items-center justify-between gap-3 p-4">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-100/40">{t('accessCode')}</div>
            <div className="font-mono text-lg font-bold tracking-widest text-gold-200">{tournament.accessCode}</div>
          </div>
          <p className="max-w-[60%] text-right text-xs text-gold-100/40">{t('accessCodeManageHint')}</p>
        </div>

        <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-gold-200">{t('editDetails')}</h2>
        <TournamentForm tournament={tournament} />

        <h2 className="mb-3 mt-8 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
          {t('registrants')} ({registrations.length})
        </h2>
        <div className="flex flex-col gap-2">
          {registrations.map((r) => (
            <div key={r.id} className="card-surface flex items-center justify-between gap-3 p-3">
              <div>
                <div className="text-sm font-semibold text-gold-100/80">{r.playerName}</div>
                <div className="text-[11px] text-gold-100/40">
                  {format.dateTime(new Date(r.registeredAt), { dateStyle: 'medium', timeStyle: 'short' })}
                </div>
              </div>
              <DeleteButton endpoint={`/api/tournaments/${tournament.id}/registrations/${r.id}`} />
            </div>
          ))}
          {registrations.length === 0 && (
            <p className="card-surface p-4 text-center text-sm text-gold-100/40">{t('noRegistrants')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
