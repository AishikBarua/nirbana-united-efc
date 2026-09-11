'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

type NotificationItem = {
  id: string;
  type: 'MATCH_RESULT' | 'UPCOMING_FIXTURE' | 'NEWS';
  title: string;
  body: string;
  href: string | null;
  createdAt: string;
};

const TAG_KEY: Record<NotificationItem['type'], 'tagClub' | 'tagNews'> = {
  MATCH_RESULT: 'tagClub',
  UPCOMING_FIXTURE: 'tagClub',
  NEWS: 'tagNews',
};

// Per-browser "have I seen this yet" marker — the public site has no visitor
// accounts to hang a real read/unread flag off of, so this is the practical
// stand-in: it just remembers the newest notification's timestamp this
// browser has opened the panel for.
const LAST_SEEN_KEY = 'nuefc-notifications-last-seen';

// Keeps the unread dot reasonably fresh for someone who leaves the site open
// in a tab, without hammering the server — matches use hours between events,
// not seconds, so there's no need to poll any faster than this.
const POLL_MS = 3 * 60 * 1000;

export default function NotificationBell() {
  const t = useTranslations('notifications');
  const tNav = useTranslations('nav');
  const locale = useLocale();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [open, setOpen] = useState(false);
  const [hasUnread, setHasUnread] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  async function load() {
    try {
      const res = await fetch('/api/notifications');
      if (!res.ok) return;
      const data = await res.json();
      const list: NotificationItem[] = data.notifications ?? [];
      setItems(list);
      let lastSeen = 0;
      try {
        lastSeen = Number(localStorage.getItem(LAST_SEEN_KEY) ?? 0);
      } catch {
        // Private-browsing / storage blocked — just treat everything as
        // unseen rather than throwing.
      }
      const newest = list[0] ? new Date(list[0].createdAt).getTime() : 0;
      setHasUnread(newest > lastSeen);
    } catch {
      // A failed background refresh isn't worth surfacing to the visitor —
      // the bell just keeps showing whatever it last had.
    }
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, POLL_MS);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  function toggle() {
    setOpen((was) => {
      const next = !was;
      if (next) {
        setHasUnread(false);
        try {
          const newest = items[0] ? new Date(items[0].createdAt).getTime() : Date.now();
          localStorage.setItem(LAST_SEEN_KEY, String(newest));
        } catch {
          // Nothing to do if storage isn't available — the dot will just
          // reappear next load, which is a harmless fallback.
        }
      }
      return next;
    });
  }

  function relativeTime(iso: string) {
    const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
    const diffMin = Math.round((new Date(iso).getTime() - Date.now()) / 60000);
    if (Math.abs(diffMin) < 60) return rtf.format(diffMin, 'minute');
    const diffHr = Math.round(diffMin / 60);
    if (Math.abs(diffHr) < 24) return rtf.format(diffHr, 'hour');
    return rtf.format(Math.round(diffHr / 24), 'day');
  }

  return (
    // No `relative` here on purpose: this wrapper is only button-sized, so
    // anchoring the dropdown to IT (as it used to) put the panel's right
    // edge at the bell icon's own right edge — fine on a wide screen, but
    // on a narrow phone the bell sits well left of the true screen edge
    // (search icon, locale switcher, and hamburger all crowd in after it),
    // so the ~330px-wide panel spilled off the LEFT of the viewport with
    // most of it unreadable. The dropdown below instead anchors to the
    // nearest positioned ancestor, which is the icon-cluster div in
    // Navbar.tsx (given `relative` there on purpose) — that div's right
    // edge is the page's actual right-side content edge, so the panel
    // always lands fully on-screen regardless of icon count or width.
    <div ref={wrapRef}>
      <button
        type="button"
        aria-label={tNav('notificationsLabel')}
        aria-expanded={open}
        onClick={toggle}
        className="relative flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/30 text-gold-200 transition hover:border-gold-400/50 hover:bg-gold-400/10"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {hasUnread && (
          <span className="absolute right-0.5 top-0.5 h-2.5 w-2.5 rounded-full border-2 border-ink-950 bg-signal-red" />
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-[min(360px,calc(100vw-2rem))] overflow-hidden rounded-xl border border-gold-400/20 bg-ink-900 shadow-2xl">
          <div className="border-b border-gold-400/10 px-4 py-3 text-xs font-bold uppercase tracking-[0.2em] text-gold-300">
            {t('title')}
          </div>
          <div className="max-h-[70vh] overflow-y-auto">
            {items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gold-100/40">{t('empty')}</p>
            ) : (
              items.map((n) => {
                const inner = (
                  <div className="flex flex-col gap-1 border-b border-gold-400/5 px-4 py-3 transition group-hover:bg-gold-400/5">
                    <span className="text-sm font-semibold leading-snug text-gold-100">{n.title}</span>
                    <span className="text-xs leading-snug text-gold-100/55">{n.body}</span>
                    <span className="text-[11px] font-semibold text-gold-400/70">
                      {relativeTime(n.createdAt)} · {t(TAG_KEY[n.type])}
                    </span>
                  </div>
                );
                return n.href ? (
                  <Link key={n.id} href={n.href} onClick={() => setOpen(false)} className="group block">
                    {inner}
                  </Link>
                ) : (
                  <div key={n.id}>{inner}</div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
