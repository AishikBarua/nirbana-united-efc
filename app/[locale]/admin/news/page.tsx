import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import { listNews } from '@/lib/services/newsService';
import AdminNav from '@/components/admin/AdminNav';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function AdminNewsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.news');
  const tc = await getTranslations('common');
  const format = await getFormatter();

  const posts = await listNews();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
          <Link href="/admin/news/new" className="btn-primary text-sm">{t('newPost')}</Link>
        </div>

        <div className="card-surface overflow-x-auto">
          <table className="w-full min-w-[600px] text-sm">
            <thead>
              <tr className="border-b border-gold-400/15 text-left text-[11px] uppercase tracking-wide text-gold-100/40">
                <th className="px-4 py-3">{t('postTitle')}</th>
                <th className="px-3 py-3">{t('publishedDate')}</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {posts.map((p) => (
                <tr key={p.id} className="border-b border-gold-400/5 last:border-0">
                  <td className="px-4 py-3 font-medium text-gold-100">{p.title}</td>
                  <td className="px-3 py-3 text-gold-100/60">{format.dateTime(new Date(p.publishedDate), { dateStyle: 'medium' })}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-end gap-2">
                      <Link href={`/admin/news/${p.id}`} className="rounded-md border border-gold-400/30 px-3 py-1.5 text-xs font-semibold text-gold-200 hover:bg-gold-400/10">
                        {tc('edit')}
                      </Link>
                      <DeleteButton endpoint={`/api/news/${p.id}`} />
                    </div>
                  </td>
                </tr>
              ))}
              {posts.length === 0 && (
                <tr>
                  <td colSpan={3} className="px-4 py-6 text-center text-gold-100/40">—</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
