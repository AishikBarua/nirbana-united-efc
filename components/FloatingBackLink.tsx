'use client';

import { useEffect, useState } from 'react';
import { Link } from '@/lib/navigation';

/** A "back to X" shortcut that stays reachable no matter how far you've
 * scrolled down a detail page (a player profile, a news post) — the
 * existing inline link at the top of those pages only helps if you're
 * still near the top. This fades in once you've scrolled a bit and stays
 * fixed in the corner, so getting back doesn't mean scrolling all the way
 * back up first. It hides itself again near the top since the inline link
 * is already visible there. */
export default function FloatingBackLink({ href, label }: { href: string; label: string }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    function onScroll() {
      setVisible(window.scrollY > 280);
    }
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <Link
      href={href}
      aria-label={label}
      tabIndex={visible ? 0 : -1}
      className={`fixed bottom-5 left-4 z-30 flex items-center gap-2 rounded-full border border-gold-400/30 bg-ink-900/90 py-2.5 pl-2.5 pr-4 text-xs font-bold uppercase tracking-wide text-gold-200 shadow-gold backdrop-blur transition-all duration-300 hover:border-gold-400/50 hover:bg-gold-400/10 ${
        visible ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-3 opacity-0'
      }`}
    >
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold-400/15">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      <span className="whitespace-nowrap">{label}</span>
    </Link>
  );
}
