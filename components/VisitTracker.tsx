'use client';

import { useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

/**
 * Invisible analytics beacon, mounted once in app/[locale]/layout.tsx so it
 * runs on every page of the public site. Pings /api/track on first load and
 * again on every client-side route change — a plain Server Component in the
 * root layout would only fire on a real page load, and Next.js App Router
 * navigations inside the same layout are client-side, so this is a client
 * component watching the pathname instead (the same technique real
 * lightweight analytics scripts like Plausible/Fathom use).
 *
 * Never tracks /admin pages, and never throws or logs to the visible
 * console on failure — a tracking hiccup must be completely invisible to a
 * real visitor.
 */
export default function VisitTracker() {
  const pathname = usePathname();
  const lastTracked = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    if (pathname.startsWith('/admin') || /^\/[a-z]{2}\/admin(\/|$)/i.test(pathname)) return;
    // Guards against double-firing in React 18 StrictMode (dev only) and
    // any redundant re-render for the exact same path.
    if (lastTracked.current === pathname) return;
    lastTracked.current = pathname;

    const localeMatch = /^\/([a-z]{2})(\/|$)/i.exec(pathname);
    const locale = localeMatch ? localeMatch[1] : null;

    fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        path: pathname,
        locale,
        referrer: typeof document !== 'undefined' ? document.referrer || null : null,
      }),
      // Never let this beacon block or delay navigation.
      keepalive: true,
    }).catch(() => {
      /* silently ignore — analytics must never affect the visitor's experience */
    });
  }, [pathname]);

  return null;
}
