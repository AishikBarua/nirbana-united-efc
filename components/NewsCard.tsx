import Image from 'next/image';
import { useTranslations, useFormatter } from 'next-intl';
import { Link } from '@/lib/navigation';
import type { News } from '@prisma/client';

export default function NewsCard({ post }: { post: News }) {
  const t = useTranslations('home');
  const format = useFormatter();

  return (
    <Link
      href={`/news/${post.id}`}
      className="card-surface group flex flex-col overflow-hidden transition hover:-translate-y-1 hover:shadow-gold"
    >
      {post.imageUrl && (
        <div className="relative aspect-[16/9] w-full overflow-hidden bg-ink-800">
          <Image
            src={post.imageUrl}
            alt={post.title}
            fill
            sizes="(max-width: 640px) 100vw, 400px"
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-gold-400/70">
          {format.dateTime(new Date(post.publishedDate), { dateStyle: 'medium' })}
        </div>
        <div className="font-display text-lg font-bold text-gold-100">{post.title}</div>
        <p className="line-clamp-2 text-sm text-gold-100/60">{post.body}</p>
        <span className="mt-auto text-xs font-bold uppercase tracking-wide text-signal-teal">
          {t('readMore')} →
        </span>
      </div>
    </Link>
  );
}
