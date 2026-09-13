import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { requireAdmin } from '@/lib/auth';
import { Link } from '@/lib/navigation';
import { getClubInfo } from '@/lib/services/clubService';
import { countPendingComments } from '@/lib/services/commentService';
import AdminNav from '@/components/admin/AdminNav';
import SyncTrackerButton from '@/components/admin/SyncTrackerButton';

export default async function AdminDashboardPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.dashboard');
  const admin = await requireAdmin();
  const clubInfo = await getClubInfo();
  const pendingComments = await countPendingComments();

  const cards: { href: string; label: string; badge?: number }[] = [
    { href: '/admin/players', label: t('managePlayers') },
    { href: '/admin/matches', label: t('manageMatches') },
    { href: '/admin/tournaments', label: t('manageTournaments') },
    { href: '/admin/news', label: t('manageNews') },
    { href: '/admin/standings', label: t('manageStandings') },
    { href: '/admin/gallery', label: t('manageGallery') },
    { href: '/admin/highlights', label: t('manageHighlights') },
    { href: '/admin/comments', label: t('manageComments'), badge: pendingComments > 0 ? pendingComments : undefined },
    { href: '/admin/club', label: t('manageClub') },
    { href: '/admin/analytics', label: t('analytics') },
    { href: '/admin/settings', label: t('settings') },
  ];

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="font-display text-2xl font-bold text-gold-100">
          {t('welcome')}{admin ? `, ${admin.email}` : ''}
        </h1>

        <div className="mt-8">
          <SyncTrackerButton initialLastSyncedAt={clubInfo?.lastSyncedAt?.toISOString() ?? null} />
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((c) => (
            <Link
              key={c.href}
              href={c.href}
              className="card-surface flex items-center justify-between gap-3 p-6 transition hover:-translate-y-1 hover:shadow-gold"
            >
              <div className="font-display text-lg font-bold text-gold-200">{c.label}</div>
              {c.badge !== undefined && (
                <span className="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-signal-red px-1.5 text-xs font-bold text-white">
                  {c.badge}
                </span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
