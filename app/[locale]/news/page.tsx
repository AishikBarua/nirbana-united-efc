import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { listNews } from '@/lib/services/newsService';
import SectionHeading from '@/components/SectionHeading';
import NewsCard from '@/components/NewsCard';

export default async function NewsPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('news');

  const posts = await listNews();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading title={t('title')} />
      {posts.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <NewsCard key={post.id} post={post} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-gold-100/50">{t('noNews')}</p>
      )}
    </div>
  );
}
