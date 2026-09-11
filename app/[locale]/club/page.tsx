import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { parseJsonArray, safeMultiline } from '@/lib/utils';
import { getClubInfo } from '@/lib/services/clubService';
import SectionHeading from '@/components/SectionHeading';

export default async function ClubPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('club');

  const info = await getClubInfo();
  const achievements = parseJsonArray(info?.achievementsJson);

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
      <SectionHeading eyebrow={info?.founded ? `${t('founded')} ${info.founded}` : undefined} title={t('title')} />

      <div className="card-surface p-6 sm:p-8">
        <h3 className="mb-3 font-display text-xl font-bold text-gold-200">{t('history')}</h3>
        <p className="whitespace-pre-line text-sm leading-relaxed text-gold-100/70 sm:text-base">
          {safeMultiline(info?.history) || '—'}
        </p>
      </div>

      {achievements.length > 0 && (
        <div className="card-surface mt-6 p-6 sm:p-8">
          <h3 className="mb-4 font-display text-xl font-bold text-gold-200">{t('achievements')}</h3>
          <ul className="space-y-2">
            {achievements.map((a, i) => (
              <li key={i} className="flex items-start gap-3 text-sm text-gold-100/70">
                <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-gold-400" />
                {a}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
