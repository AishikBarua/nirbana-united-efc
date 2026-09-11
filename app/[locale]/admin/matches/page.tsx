import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { listMatches } from '@/lib/services/matchService';
import AdminNav from '@/components/admin/AdminNav';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function AdminMatchesPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.matches');
  const tc = await getTranslations('common');
  const format = await getFormatter();

  const matches = await listMatches();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
          <Link href="/admin/matches/new" className="btn-primary text-sm">{t('newMatch')}</Link>
        </div>

        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-gold-400/15 text-left text-[11px] uppercase tracking-wide text-gold-100/40">
                <th className="px-4 py-3">{t('opponent')}</th>
                <th className="px-3 py-3">{t('date')}</th>
                <th className="px-3 py-3">{t('status')}</th>
                <th className="px-3 py-3 text-center">Score</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((m) => (
                <tr key={m.id} className="border-b border-gold-400/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-gold-100">{m.opponent}</td>
                  <td className="px-3 py-3 text-gold-100/60">{format.dateTime(new Date(m.date), { dateStyle: 'medium', timeStyle: 'short' })}</td>
                  <td className="px-3 py-3 text-gold-100/60">{m.status === 'UPCOMING' ? t('upcoming') : t('completed')}</td>
                  <td className="px-3 py-3 text-center text-gold-100/60">
                    {m.ourScore !== null && m.opponentScore !== null ? `${m.ourScore} – ${m.opponentScore}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/matches/${m.id}`} className="rounded-md border border-gold-400/30 px-3 py-1.5 text-xs font-semibold text-gold-200 hover:bg-gold-400/10">
                        {tc('edit')}
                      </Link>
                      <DeleteButton endpoint={`/api/matches/${m.id}`} />
                    </div>
                  </td>
                </tr>
              ))}
              {matches.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-gold-100/40">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
