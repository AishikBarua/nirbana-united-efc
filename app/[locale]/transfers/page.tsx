import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import SectionHeading from '@/components/SectionHeading';
import { listTransfers } from '@/lib/services/transferService';

const TYPE_STYLE: Record<string, string> = {
  NEW_REGISTER: 'bg-signal-teal/15 text-signal-teal',
  TRANSFER: 'bg-gold-400/15 text-gold-300',
  UNREGISTER: 'bg-red-500/15 text-red-400',
};

export default async function TransfersPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('transfers');
  const format = await getFormatter();

  // Populated by the tracker sync (sync-with-tracker.bat locally, or the
  // "Sync with Tracker" button in /admin online) — the service returns a
  // safe empty list if a sync hasn't run yet, rather than throwing.
  const events = await listTransfers();

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <SectionHeading title={t('title')} eyebrow={t('eyebrow')} />
      <p className="mb-8 text-sm text-gold-100/50">{t('subtitle')}</p>

      {events.length > 0 ? (
        <div className="space-y-3">
          {events.map((e) => (
            <div key={e.id} className="card-surface flex items-center gap-4 p-4">
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide ${
                  TYPE_STYLE[e.type] ?? 'bg-gold-400/15 text-gold-300'
                }`}
              >
                {t(`type.${e.type}`)}
              </span>
              <div className="flex-1">
                <div className="font-display text-sm font-bold text-gold-100 sm:text-base">{e.player}</div>
                <div className="mt-0.5 text-xs text-gold-100/40">
                  {e.squad}
                  {e.fromClub ? ` · ${t('from')} ${e.fromClub}` : ''}
                </div>
              </div>
              <div className="whitespace-nowrap text-xs text-gold-100/40">
                {format.dateTime(e.date, { dateStyle: 'medium' })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-gold-100/50">{t('noTransfers')}</p>
      )}
    </div>
  );
}
