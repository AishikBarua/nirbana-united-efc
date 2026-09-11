'use client';

import { useEffect } from 'react';
import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

/**
 * Catches any runtime error thrown while rendering a page or component
 * inside this locale (a bad prop, a browser-extension DOM conflict, a bug)
 * and shows a calm, on-brand message instead of a raw crash screen. The
 * layout above this (navbar, footer, and the next-intl provider `t` here
 * relies on) stays mounted — only the broken part of the page is replaced.
 *
 * `reset()` re-renders the segment that crashed without a full page
 * reload, so "Try Again" can recover from a transient glitch.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations('errorBoundary');

  useEffect(() => {
    // Logged to the browser console only — never shown to the visitor —
    // so this is still diagnosable from devtools if it's ever reported.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10 text-gold-300">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86 1.82 18a1.5 1.5 0 0 0 1.29 2.25h17.78A1.5 1.5 0 0 0 22.18 18L13.71 3.86a1.5 1.5 0 0 0-2.42 0Z" />
        </svg>
      </div>
      <h1 className="font-display text-2xl font-bold text-gold-100">{t('title')}</h1>
      <p className="mt-2 text-sm text-gold-100/60">{t('description')}</p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => reset()} className="btn-primary">
          {t('tryAgain')}
        </button>
        <Link href="/" className="btn-secondary">
          {t('goHome')}
        </Link>
      </div>
    </div>
  );
}
