'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { Link, usePathname } from '@/lib/navigation';
import LocaleSwitcher from './LocaleSwitcher';
import NotificationBell from './NotificationBell';

// Only these show inline in the top bar. Everything else lives in the full
// menu panel (opened by the "more" button), grouped below.
const QUICK_LINKS = [
  { href: '/', key: 'home', icon: 'home' },
  { href: '/club', key: 'club', icon: 'shield' },
  { href: '/players', key: 'players', icon: 'users' },
  { href: '/gallery', key: 'gallery', icon: 'image' },
] as const;

const MENU_GROUPS = [
  {
    group: 'groupClub',
    items: [
      { href: '/', key: 'home', icon: 'home' },
      { href: '/club', key: 'club', icon: 'shield' },
      { href: '/players', key: 'players', icon: 'users' },
      { href: '/gallery', key: 'gallery', icon: 'image' },
    ],
  },
  {
    group: 'groupCompetition',
    items: [
      { href: '/matches', key: 'matches', icon: 'ball' },
      { href: '/transfers', key: 'transfers', icon: 'swap' },
      { href: '/rankings', key: 'rankings', icon: 'trophy' },
      { href: '/standings', key: 'standings', icon: 'table' },
    ],
  },
  {
    group: 'groupNews',
    items: [{ href: '/news', key: 'news', icon: 'megaphone' }],
  },
] as const;

type IconName = (typeof MENU_GROUPS)[number]['items'][number]['icon'];

function NavIcon({ name, className }: { name: IconName; className?: string }) {
  const common = {
    className,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.7,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
  };
  switch (name) {
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10v9a1 1 0 0 0 1 1h3v-6h4v6h3a1 1 0 0 0 1-1v-9" />
        </svg>
      );
    case 'shield':
      return (
        <svg {...common}>
          <path d="M12 3.5 5 6v5.2c0 4.7 3 7.9 7 9.3 4-1.4 7-4.6 7-9.3V6l-7-2.5Z" />
          <path d="m9.3 12 1.9 1.9 3.6-3.8" />
        </svg>
      );
    case 'users':
      return (
        <svg {...common}>
          <circle cx="9" cy="8.5" r="2.75" />
          <path d="M3.5 19c.6-3 2.7-4.7 5.5-4.7s4.9 1.7 5.5 4.7" />
          <circle cx="17" cy="9.5" r="2.1" />
          <path d="M15.2 14.6c2.3.2 3.9 1.8 4.3 4.1" />
        </svg>
      );
    case 'ball':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="8.25" />
          <path d="m12 8 3.2 2.3-1.2 3.7H10L8.8 10.3 12 8Z" />
          <path d="M12 3.8V6m0 12v2.2M4.3 9l2.1.7m11.3-.7-2.1.7M4.3 15l2.1-.7m11.3.7-2.1-.7" />
        </svg>
      );
    case 'swap':
      return (
        <svg {...common}>
          <path d="M4 8h13.5M14 4.5 17.5 8 14 11.5" />
          <path d="M20 16H6.5M10 12.5 6.5 16l3.5 3.5" />
        </svg>
      );
    case 'trophy':
      return (
        <svg {...common}>
          <path d="M7 4h10v4.2c0 3-2.2 5.3-5 5.3s-5-2.3-5-5.3V4Z" />
          <path d="M7 5.2H4.6C4.6 8 6 9.6 8 9.9M17 5.2h2.4c0 2.8-1.4 4.4-3.4 4.7" />
          <path d="M12 13.5V17m-3 3.5h6M9 20.5l.6-3.3M15 20.5l-.6-3.3" />
        </svg>
      );
    case 'megaphone':
      return (
        <svg {...common}>
          <path d="M3 10.5v3a1 1 0 0 0 1 1h1.6L11 18v-11l-5.4 3.5H4a1 1 0 0 0-1 1Z" />
          <path d="M14 8.3a4 4 0 0 1 0 7.4M17 6a7.5 7.5 0 0 1 0 12" />
        </svg>
      );
    case 'table':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.5" />
          <path d="M3.5 9.5h17M9 9.5V19.5" />
        </svg>
      );
    case 'image':
      return (
        <svg {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="1.8" />
          <circle cx="8.5" cy="9.5" r="1.6" />
          <path d="m5 17 4.5-4.5a1.5 1.5 0 0 1 2.1 0L15 16m-1-2 1.6-1.6a1.5 1.5 0 0 1 2.1 0L20 15" />
        </svg>
      );
  }
}

type SearchResult = {
  type: 'player' | 'match' | 'news';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

const RESULT_TYPE_LABEL_KEY: Record<SearchResult['type'], string> = {
  player: 'players',
  match: 'matches',
  news: 'news',
};

export default function Navbar() {
  const t = useTranslations('nav');
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Tracks whether the slide-out panel was opened via the dedicated search
  // icon (vs. the hamburger) so it knows to autofocus the search input —
  // both open the same panel, since the search box already lives in it.
  const [openReason, setOpenReason] = useState<'menu' | 'search'>('menu');
  const [query, setQuery] = useState('');
  const [contentResults, setContentResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  function openMenu() {
    setOpenReason('menu');
    setOpen(true);
  }

  function openSearch() {
    setOpenReason('search');
    setOpen(true);
  }

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setContentResults([]);
      return;
    }
    if (openReason === 'search') {
      // Wait out the slide-in transition so focusing the input doesn't fight
      // the panel's own transform animation.
      const timer = setTimeout(() => searchInputRef.current?.focus(), 320);
      return () => clearTimeout(timer);
    }
  }, [open, openReason]);

  // Debounced live search against actual site content (players, matches,
  // news) — separate from the instant, client-side filter of the static
  // nav-menu labels below, which needs no round trip.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setContentResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setContentResults(data.results ?? []);
      } catch {
        setContentResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query]);

  const filteredGroups = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MENU_GROUPS;
    return MENU_GROUPS.map((g) => ({
      ...g,
      items: g.items.filter((item) => t(item.key).toLowerCase().includes(q)),
    })).filter((g) => g.items.length > 0);
  }, [query, t]);

  const hasQuery = query.trim().length >= 2;
  const noResultsAtAll = hasQuery && !searching && filteredGroups.length === 0 && contentResults.length === 0;

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-gold-400/15 bg-ink-950/90 backdrop-blur">
        {/* relative here is what the nav below centers against, and what
            NotificationBell's dropdown anchors to (see its own comment) —
            it's the true content edge (inside the px-4/px-6 gutter). */}
        <div className="relative mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
          {/* min-w-0 lets this shrink instead of forcing the icon cluster
              off to the right or under it — without it, the long club name
              wraps to 2-3 lines on a narrow phone and the (vertically
              centered) search/bell/menu icons visually collide with the
              wrapped text. truncate on the name is the other half of that
              fix: it clips with an ellipsis rather than wrapping. */}
          <Link href="/" className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
            <Image
              src="/brand/crest.jpg"
              alt="Nirbana United EFC crest"
              width={44}
              height={44}
              className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-gold-400/40 sm:h-11 sm:w-11"
              priority
            />
            <div className="min-w-0 leading-tight">
              <div className="truncate font-display text-base font-bold tracking-wide text-gold-200 sm:text-lg">
                Nirbana United <span className="text-gold-400">EFC</span>
              </div>
              <div className="hidden text-[10px] font-semibold uppercase tracking-[0.2em] text-gold-100/50 sm:block">
                Meditate · Dominate · Celebrate
              </div>
            </div>
          </Link>

          {/* Absolutely centered against the header's own content width
              (not just squeezed into whatever flex space is left) — the
              logo on the left and the icon cluster on the right are
              different widths, so centering this within the leftover flex
              space (its old behavior) drifted it off toward one side.
              Positioning it independently of that flow is what actually
              keeps it in the true middle regardless of either side's
              width. */}
          <nav className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-1 lg:flex">
            {QUICK_LINKS.map((item) => {
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-md px-3 py-2 text-sm font-semibold uppercase tracking-wide transition ${
                    isActive
                      ? 'bg-gold-400/10 text-gold-300'
                      : 'text-gold-100/70 hover:bg-gold-400/5 hover:text-gold-200'
                  }`}
                >
                  {t(item.key)}
                </Link>
              );
            })}
          </nav>

          <div className="relative flex shrink-0 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              aria-label={t('searchLabel')}
              onClick={openSearch}
              className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/30 text-gold-200 transition hover:border-gold-400/50 hover:bg-gold-400/10"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </button>
            <NotificationBell />
            <LocaleSwitcher />
            <button
              type="button"
              aria-label={t('more')}
              aria-expanded={open}
              className="group relative rounded-xl border border-gold-400/30 bg-gold-400/10 p-2.5 text-gold-300 shadow-card transition hover:border-gold-400/50 hover:bg-gold-400/15"
              onClick={openMenu}
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Backdrop */}
      <div
        aria-hidden={!open}
        onClick={() => setOpen(false)}
        className={`fixed inset-0 z-50 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      />

      {/* Full menu panel */}
      <aside
        aria-hidden={!open}
        className={`fixed inset-y-0 left-0 z-50 flex w-[86%] max-w-sm flex-col border-r border-gold-400/15 bg-ink-950 shadow-[8px_0_40px_-12px_rgba(0,0,0,0.8)] transition-transform duration-300 ease-out ${
          open ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between border-b border-gold-400/10 bg-radial-fade px-5 py-4">
          <div className="flex items-center gap-3">
            <Image
              src="/brand/crest.jpg"
              alt="Nirbana United EFC crest"
              width={38}
              height={38}
              className="h-9 w-9 rounded-full object-cover ring-1 ring-gold-400/40"
            />
            <div className="font-display text-sm font-bold tracking-wide text-gold-200">
              Nirbana United <span className="text-gold-400">EFC</span>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close menu"
            className="rounded-full border border-gold-400/20 p-1.5 text-gold-300 transition hover:border-gold-400/50 hover:text-gold-100"
            onClick={() => setOpen(false)}
          >
            <svg width="16" height="16" viewBox="0 0 20 20" fill="none">
              <path d="M5 5l10 10M15 5L5 15" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-2 pt-4">
          <div className="flex items-center gap-2.5 rounded-xl border border-gold-400/18 bg-ink-900 px-3.5 py-2.5">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="text-gold-100/35">
              <circle cx="11" cy="11" r="6.5" />
              <path d="m20 20-4.3-4.3" />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('search')}
              className="w-full bg-transparent text-sm text-gold-50 outline-none placeholder:text-gold-100/35"
            />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {hasQuery && (
            <div className="mb-1">
              <div className="mb-1.5 mt-4 flex items-center gap-2 px-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold-400/55">
                {t('groupResults')}
                {searching && (
                  <span className="h-2.5 w-2.5 animate-spin rounded-full border-[1.5px] border-gold-400/30 border-t-gold-400" />
                )}
              </div>
              {contentResults.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {contentResults.map((r) => (
                    <Link
                      key={`${r.type}-${r.id}`}
                      href={r.href}
                      onClick={() => setOpen(false)}
                      className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-gold-100/70 transition hover:bg-gold-400/5 hover:text-gold-100"
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-gold-400/15 bg-ink-800 text-gold-100/60 transition group-hover:border-gold-400/30 group-hover:text-gold-200">
                        <NavIcon
                          name={r.type === 'player' ? 'users' : r.type === 'match' ? 'ball' : 'megaphone'}
                          className="h-[18px] w-[18px]"
                        />
                      </span>
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate normal-case tracking-normal">{r.title}</span>
                        <span className="truncate text-[11px] font-normal normal-case tracking-normal text-gold-100/40">
                          {t(RESULT_TYPE_LABEL_KEY[r.type])} · {r.subtitle}
                        </span>
                      </span>
                    </Link>
                  ))}
                </div>
              ) : (
                !searching && <p className="px-2 pb-2 text-xs text-gold-100/35">{t('noContentResults')}</p>
              )}
            </div>
          )}

          {filteredGroups.length > 0 &&
            filteredGroups.map((g) => (
              <div key={g.group} className="mb-1">
                <div className="mb-1.5 mt-4 px-2 text-[10px] font-bold uppercase tracking-[0.25em] text-gold-400/55">
                  {t(g.group)}
                </div>
                <div className="flex flex-col gap-1">
                  {g.items.map((item) => {
                    const isActive = pathname === item.href;
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setOpen(false)}
                        className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition ${
                          isActive
                            ? 'bg-gold-400/12 text-gold-200 shadow-gold'
                            : 'text-gold-100/70 hover:bg-gold-400/5 hover:text-gold-100'
                        }`}
                      >
                        <span
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition ${
                            isActive
                              ? 'border-gold-400/50 bg-gold-400/15 text-gold-300'
                              : 'border-gold-400/15 bg-ink-800 text-gold-100/60 group-hover:border-gold-400/30 group-hover:text-gold-200'
                          }`}
                        >
                          <NavIcon name={item.icon} className="h-[18px] w-[18px]" />
                        </span>
                        <span className="uppercase tracking-wide">{t(item.key)}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}

          {noResultsAtAll && <p className="px-2 py-6 text-center text-sm text-gold-100/40">{t('noResults')}</p>}
        </nav>

        <div className="border-t border-gold-400/10 px-5 py-4">
          <LocaleSwitcher />
        </div>
      </aside>
    </>
  );
}
