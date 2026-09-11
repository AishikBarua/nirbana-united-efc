'use client';

import { useEffect } from 'react';

/**
 * The last-resort error boundary — only used if something throws inside the
 * root layout itself (app/[locale]/layout.tsx), which every normal page
 * error.tsx boundary sits *inside* of and so can't catch. This replaces the
 * entire document, so it must define its own <html>/<body> and can't lean
 * on next-intl (there's no provider left to read from) or assume Tailwind's
 * stylesheet loaded cleanly — hence plain inline styles and English-only
 * text, kept intentionally minimal.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '1rem',
          padding: '2rem 1rem',
          textAlign: 'center',
          backgroundColor: '#0a0806',
          color: '#f5e6c2',
          fontFamily: 'system-ui, -apple-system, Segoe UI, Roboto, sans-serif',
        }}
      >
        <h1 style={{ fontSize: '1.5rem', fontWeight: 700, margin: 0 }}>Something went wrong</h1>
        <p style={{ fontSize: '0.9rem', color: 'rgba(245, 230, 194, 0.6)', margin: 0, maxWidth: '28rem' }}>
          The site ran into an unexpected problem loading this page. Please try again.
        </p>
        <button
          type="button"
          onClick={() => reset()}
          style={{
            marginTop: '0.5rem',
            padding: '0.6rem 1.5rem',
            borderRadius: '0.5rem',
            border: 'none',
            backgroundColor: '#e8c27a',
            color: '#0a0806',
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
