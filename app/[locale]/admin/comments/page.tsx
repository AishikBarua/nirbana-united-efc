import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { listCommentsForAdminWithLabels } from '@/lib/services/commentService';
import { Link } from '@/lib/navigation';
import AdminNav from '@/components/admin/AdminNav';
import ApproveButton from '@/components/admin/ApproveButton';
import DeleteButton from '@/components/admin/DeleteButton';

export default async function AdminCommentsPage({
  params: { locale },
  searchParams,
}: {
  params: { locale: string };
  searchParams: { status?: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.comments');
  const format = await getFormatter();

  const status = searchParams.status === 'APPROVED' ? 'APPROVED' : 'PENDING';
  const comments = await listCommentsForAdminWithLabels(status);

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
          <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/comments"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                status === 'PENDING'
                  ? 'bg-gold-400 text-ink-950'
                  : 'border border-gold-400/30 text-gold-200 hover:bg-gold-400/10'
              }`}
            >
              {t('pending')}
            </Link>
            <Link
              href="/admin/comments?status=APPROVED"
              className={`rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide ${
                status === 'APPROVED'
                  ? 'bg-gold-400 text-ink-950'
                  : 'border border-gold-400/30 text-gold-200 hover:bg-gold-400/10'
              }`}
            >
              {t('approved')}
            </Link>
          </div>
        </div>

        <p className="mb-6 text-sm text-gold-100/50">{t('subtitle')}</p>

        <div className="flex flex-col gap-3">
          {comments.map((c) => (
            <div key={c.id} className="card-surface p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wide text-signal-teal">@{c.authorName}</div>
                  <div className="mt-0.5 text-[11px] text-gold-100/40">
                    {c.targetType === 'NEWS' ? t('onNews') : t('onGallery')}: {c.targetLabel} ·{' '}
                    {format.dateTime(new Date(c.createdAt), { dateStyle: 'medium', timeStyle: 'short' })}
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  {status === 'PENDING' && <ApproveButton endpoint={`/api/comments/${c.id}`} />}
                  <DeleteButton endpoint={`/api/comments/${c.id}`} />
                </div>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm text-gold-100/80">{c.body}</p>
            </div>
          ))}
          {comments.length === 0 && (
            <p className="card-surface p-6 text-center text-sm text-gold-100/40">{t('empty')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
