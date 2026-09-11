import { notFound } from 'next/navigation';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { getNewsPost } from '@/lib/services/newsService';
import AdminNav from '@/components/admin/AdminNav';
import NewsForm from '@/components/admin/NewsForm';

export default async function EditNewsPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.news');
  const post = await getNewsPost(id);
  if (!post) notFound();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('editPost')}</h1>
        <NewsForm post={post} />
      </div>
    </div>
  );
}
