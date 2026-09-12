import { getTranslations } from 'next-intl/server';
import { Link } from '@/lib/navigation';
import LogoutButton from './LogoutButton';

export default async function AdminNav() {
  const t = await getTranslations('admin.dashboard');

  const links = [
    { href: '/admin/dashboard', label: t('title') },
    { href: '/admin/players', label: t('managePlayers') },
    { href: '/admin/matches', label: t('manageMatches') },
    { href: '/admin/news', label: t('manageNews') },
    { href: '/admin/standings', label: t('manageStandings') },
    { href: '/admin/gallery', label: t('manageGallery') },
    { href: '/admin/highlights', label: t('manageHighlights') },
    { href: '/admin/comments', label: t('manageComments') },
    { href: '/admin/club', label: t('manageClub') },
    { href: '/admin/settings', label: t('settings') },
  ];

  return (
    <div className="border-b border-gold-400/10 bg-ink-900">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <nav className="flex flex-wrap gap-1">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-md px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-gold-100/60 hover:bg-gold-400/10 hover:text-gold-200"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-xs font-semibold uppercase tracking-wide text-signal-teal">
            {t('viewSite')}
          </Link>
          <LogoutButton />
        </div>
      </div>
    </div>
  );
}
