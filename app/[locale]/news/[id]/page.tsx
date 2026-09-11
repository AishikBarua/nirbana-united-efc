import Image from 'next/image';
import { notFound } from 'next/navigation';
import { getTranslations, getFormatter, unstable_setRequestLocale } from 'next-intl/server';
import { getNewsPost } from '@/lib/services/newsService';
import BackLink from '@/components/BackLink';
import FloatingBackLink from '@/components/FloatingBackLink';
import CommentBox from '@/components/CommentBox';

export default async function NewsDetailPage({
  params: { locale, id },
}: {
  params: { locale: string; id: string };
}) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('news');
  const format = await getFormatter();

  const post = await getNewsPost(id);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
      <BackLink href="/news" label={t('backToNews')} />
      <FloatingBackLink href="/news" label={t('backToNews')} />

      {post.imageUrl && (
        <div className="relative mb-6 aspect-[16/9] w-full overflow-hidden rounded-2xl border border-gold-400/15">
          <Image src={post.imageUrl} alt={post.title} fill sizes="100vw" className="object-cover" />
        </div>
      )}

      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gold-400/70">
        {format.dateTime(new Date(post.publishedDate), { dateStyle: 'full' })}
      </div>
      <h1 className="font-display text-2xl font-bold text-gold-100 sm:text-3xl">{post.title}</h1>
      <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-gold-100/70 sm:text-base">
        {post.body}
      </p>

      <div className="mt-10 border-t border-gold-400/10 pt-8">
        <CommentBox targetType="NEWS" targetId={post.id} />
      </div>
    </div>
  );
}
