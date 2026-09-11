'use client';

import { useEffect } from 'react';

/**
 * Next.js App Router's client-side hydration resets scroll position to the
 * top even when the URL has a #hash (e.g. /matches#<matchId> links coming
 * from search results) — the browser's native scroll-to-anchor behavior
 * gets overridden. This component re-applies that scroll manually once the
 * page has mounted, so hash links from search actually land on the target
 * element instead of the top of the page.
 *
 * Uses the default (instant) scrollIntoView rather than behavior: 'smooth' —
 * smooth scrolling was found to silently no-op in some environments, while
 * the instant jump is reliable everywhere.
 */
export default function ScrollToHash() {
  useEffect(() => {
    const { hash } = window.location;
    if (!hash) return;

    let id: string;
    try {
      id = decodeURIComponent(hash.slice(1));
    } catch {
      id = hash.slice(1);
    }
    if (!id) return;

    // Give the browser a moment to finish laying out the page before
    // measuring/scrolling. A single attempt — calling scrollIntoView more
    // than once (e.g. again a bit later) was found to compound into an
    // overshoot, since the second call can run mid-scroll from the first.
    const t = setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 150);
    return () => clearTimeout(t);
  }, []);

  return null;
}
