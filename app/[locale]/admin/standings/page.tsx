import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { listStandings } from '@/lib/services/standingService';
import AdminNav from '@/components/admin/AdminNav';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function AdminStandingsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.standings');
  const tc = await getTranslations('common');

  const rows = await listStandings();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
          <Link href="/admin/standings/new" className="btn-primary text-sm">{t('newRow')}</Link>
        </div>

        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-gold-400/15 text-left text-[11px] uppercase tracking-wide text-gold-100/40">
                <th className="px-4 py-3">#</th>
                <th className="px-3 py-3">{t('teamName')}</th>
                <th className="px-3 py-3 text-center">{t('points')}</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className={`border-b border-gold-400/5 last:border-0 ${r.isUs ? 'bg-gold-400/5' : ''}`}>
                  <td className="px-4 py-3 font-medium text-gold-100">{r.position}</td>
                  <td className="px-3 py-3 text-gold-100/60">{r.teamName}{r.isUs ? ' ⭐' : ''}</td>
                  <td className="px-3 py-3 text-center text-gold-100/60">{r.points}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/standings/${r.id}`} className="rounded-md border border-gold-400/30 px-3 py-1.5 text-xs font-semibold text-gold-200 hover:bg-gold-400/10">
                        {tc('edit')}
                      </Link>
                      <DeleteButton endpoint={`/api/standings/${r.id}`} />
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-gold-100/40">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
