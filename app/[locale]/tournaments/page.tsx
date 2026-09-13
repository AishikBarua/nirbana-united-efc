import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { listPublicTournaments } from '@/lib/services/tournamentService';
import SectionHeading from '@/components/SectionHeading';

const STATUS_KEY: Record<string, string> = {
  REGISTRATION_OPEN: 'statusRegistrationOpen',
  REGISTRATION_CLOSED: 'statusRegistrationClosed',
  IN_PROGRESS: 'statusInProgress',
  COMPLETED: 'statusCompleted',
  CANCELLED: 'statusCancelled',
};

export default async function TournamentsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('tournaments');
  const format = await getFormatter();

  const tournaments = await listPublicTournaments();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeading title={t('title')} eyebrow={t('eyebrow')} />
      <p className="mb-6 text-sm text-gold-100/50">{t('subtitle')}</p>

      <div className="flex flex-col gap-3">
        {tournaments.map((tour) => (
          <Link
            key={tour.id}
            href={`/tournaments/${tour.slug}`}
            className="card-surface flex flex-wrap items-center justify-between gap-3 p-5 transition hover:-translate-y-0.5 hover:shadow-gold"
          >
            <div>
              <div className="font-display text-lg font-bold text-gold-200">{tour.name}</div>
              {tour.startDate && (
                <div className="mt-1 text-xs text-gold-100/40">
                  {format.dateTime(new Date(tour.startDate), { dateStyle: 'medium' })}
                </div>
              )}
            </div>
            <span className="rounded-full border border-gold-400/30 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-gold-200">
              {t(STATUS_KEY[tour.status] ?? 'statusRegistrationOpen')}
            </span>
          </Link>
        ))}
        {tournaments.length === 0 && <p className="text-sm text-gold-100/50">{t('noTournaments')}</p>}
      </div>
    </div>
  );
}
