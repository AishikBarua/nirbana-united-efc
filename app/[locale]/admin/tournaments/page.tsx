import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { listTournaments, countRegistrations } from '@/lib/services/tournamentService';
import AdminNav from '@/components/admin/AdminNav';
import DeleteButton from '@/components/admin/DeleteButton';

const STATUS_KEY: Record<string, string> = {
  REGISTRATION_OPEN: 'statusRegistrationOpen',
  REGISTRATION_CLOSED: 'statusRegistrationClosed',
  IN_PROGRESS: 'statusInProgress',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
};

export default async function AdminTournamentsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.tournaments');
  const format = await getFormatter();

  const tournaments = await listTournaments();
  const counts = await Promise.all(tournaments.map((tour) => countRegistrations(tour.id)));

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
          <Link href="/admin/tournaments/new" className="btn-primary text-sm">{t('newTournament')}</Link>
        </div>

        <div className="flex flex-col gap-3">
          {tournaments.map((tour, i) => (
            <div key={tour.id} className="card-surface flex flex-wrap items-center justify-between gap-3 p-5">
              <Link href={`/admin/tournaments/${tour.id}`} className="min-w-0 flex-1 hover:opacity-80">
                <div className="font-display text-lg font-bold text-gold-200">{tour.name}</div>
                <div className="mt-1 text-xs text-gold-100/40">
                  {t('registrantCount', { count: counts[i] })}
                  {tour.registrationDeadline &&
                    ` · ${t('deadline')}: ${format.dateTime(new Date(tour.registrationDeadline), { dateStyle: 'medium', timeStyle: 'short' })}`}
                </div>
              </Link>
              <div className="flex shrink-0 items-center gap-3">
                <span className="rounded-full border border-gold-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-200">
                  {t(STATUS_KEY[tour.status] ?? 'statusRegistrationOpen')}
                </span>
                <DeleteButton endpoint={`/api/tournaments/${tour.id}`} />
              </div>
            </div>
          ))}
          {tournaments.length === 0 && (
            <p className="card-surface p-6 text-center text-sm text-gold-100/40">{t('noTournaments')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
