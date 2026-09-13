import { notFound } from 'next/navigation';
import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { getPublicTournamentBySlug, listRegistrations } from '@/lib/services/tournamentService';
import SectionHeading from '@/components/SectionHeading';
import TournamentRegisterForm from '@/components/TournamentRegisterForm';

const STATUS_KEY: Record<string, string> = {
  REGISTRATION_OPEN: 'statusRegistrationOpen',
  REGISTRATION_CLOSED: 'statusRegistrationClosed',
  IN_PROGRESS: 'statusInProgress',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
};

export default async function TournamentDetailPage({
  params: { locale, slug },
}: {
  params: { locale: string; slug: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('tournaments');
  const format = await getFormatter();

  // getPublicTournamentBySlug deliberately never selects `accessCode` — see
  // its own comment in lib/services/tournamentService.ts. Nothing on this
  // page (or in props passed to the client register form below) ever
  // touches that field.
  const tournament = await getPublicTournamentBySlug(slug);
  if (!tournament) notFound();

  const registrations = await listRegistrations(tournament.id);
  const deadlinePassed = Boolean(tournament.registrationDeadline && new Date() > tournament.registrationDeadline);
  const canRegister = tournament.status === 'REGISTRATION_OPEN' && !deadlinePassed;

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionHeading title={tournament.name} eyebrow={t('eyebrow')} />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-gold-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-200">
          {t(STATUS_KEY[tournament.status] ?? 'statusRegistrationOpen')}
        </span>
        {tournament.startDate && (
          <span className="text-xs text-gold-100/40">
            {t('startsOn')}: {format.dateTime(new Date(tournament.startDate), { dateStyle: 'medium' })}
          </span>
        )}
        {tournament.registrationDeadline && (
          <span className="text-xs text-gold-100/40">
            {t('deadline')}: {format.dateTime(new Date(tournament.registrationDeadline), { dateStyle: 'medium', timeStyle: 'short' })}
          </span>
        )}
      </div>

      {tournament.description && (
        <p className="mb-8 whitespace-pre-line text-sm text-gold-100/70">{tournament.description}</p>
      )}

      <div className="grid grid-cols-1 gap-8 sm:grid-cols-2">
        <div>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-gold-200">
            {t('registeredPlayers')} ({registrations.length})
          </h2>
          <ul className="flex flex-col gap-2">
            {registrations.map((r) => (
              <li key={r.id} className="card-surface px-4 py-2.5 text-sm text-gold-100/80">
                {r.playerName}
              </li>
            ))}
            {registrations.length === 0 && <p className="text-sm text-gold-100/40">{t('noRegistrantsYet')}</p>}
          </ul>
        </div>

        <div>
          <h2 className="mb-3 font-display text-sm font-bold uppercase tracking-wide text-gold-200">{t('joinTitle')}</h2>
          {canRegister ? (
            <TournamentRegisterForm tournamentId={tournament.id} />
          ) : (
            <p className="card-surface p-4 text-sm text-gold-100/50">
              {tournament.status === 'REGISTRATION_OPEN' ? t('deadlinePassed') : t('registrationNotOpen')}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
