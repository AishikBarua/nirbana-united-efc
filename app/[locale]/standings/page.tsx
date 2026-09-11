import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { listStandings } from '@/lib/services/standingService';
import SectionHeading from '@/components/SectionHeading';

export default async function StandingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('standings');

  const rows = await listStandings();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeading title={t('title')} />

      {rows.length > 0 ? (
        // No forced min-width (there used to be one) and tighter padding on
        // phones — a 7-column table needing a min-width wider than the
        // screen is exactly what forced the horizontal scrollbar; this
        // shrinks comfortably down to a narrow phone without one, with the
        // team name truncating rather than pushing everything wider.
        <div className="card-surface overflow-x-auto">
          <table className="w-full text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-gold-400/15 text-left text-[10px] uppercase tracking-wide text-gold-100/40 sm:text-[11px]">
                <th className="px-2 py-3 font-semibold sm:px-4">#</th>
                <th className="px-2 py-3 font-semibold sm:px-4">{t('team')}</th>
                <th className="px-1.5 py-3 text-center font-semibold sm:px-3">{t('played')}</th>
                <th className="px-1.5 py-3 text-center font-semibold sm:px-3">{t('won')}</th>
                <th className="px-1.5 py-3 text-center font-semibold sm:px-3">{t('drawn')}</th>
                <th className="px-1.5 py-3 text-center font-semibold sm:px-3">{t('lost')}</th>
                <th className="px-2 py-3 text-right font-semibold sm:px-4">{t('points')}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-b border-gold-400/5 last:border-0 ${
                    row.isUs ? 'bg-gold-400/10' : ''
                  }`}
                >
                  <td className="px-2 py-3 font-display font-bold text-gold-300 sm:px-4">{row.position}</td>
                  <td
                    className={`max-w-[92px] truncate px-2 py-3 font-medium sm:max-w-none sm:px-4 ${
                      row.isUs ? 'text-gold-200' : 'text-gold-100/80'
                    }`}
                  >
                    {row.teamName}
                  </td>
                  <td className="px-1.5 py-3 text-center text-gold-100/60 sm:px-3">{row.played}</td>
                  <td className="px-1.5 py-3 text-center text-gold-100/60 sm:px-3">{row.won}</td>
                  <td className="px-1.5 py-3 text-center text-gold-100/60 sm:px-3">{row.drawn}</td>
                  <td className="px-1.5 py-3 text-center text-gold-100/60 sm:px-3">{row.lost}</td>
                  <td className="px-2 py-3 text-right font-display font-bold text-gold-300 sm:px-4">{row.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-gold-100/50">{t('noStandings')}</p>
      )}
    </div>
  );
}
