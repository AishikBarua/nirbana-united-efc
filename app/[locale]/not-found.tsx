import Link from 'next/link';

/**
 * Shown whenever a page calls notFound() (an unknown player slug, a deleted
 * news post, a bad standings/match id) or a URL just doesn't match any
 * route. Next.js does not pass the [locale] route param down to a
 * not-found.tsx, so this can't reliably call next-intl's translator here —
 * it uses plain English rather than guessing the visitor's language, which
 * is safer than showing broken or mismatched text.
 *
 * A plain <a> (not the locale-aware Link from lib/navigation) is used for
 * "Back to Home" for the same reason: without a known locale we link to the
 * site root and let the middleware redirect to the right language.
 */
export default function LocaleNotFound() {
  return (
    <div className="mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-4 py-16 text-center sm:px-6">
      <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-gold-400/30 bg-gold-400/10 font-display text-xl font-bold text-gold-300">
        404
      </div>
      <h1 className="font-display text-2xl font-bold text-gold-100">Page not found</h1>
      <p className="mt-2 text-sm text-gold-100/60">
        This page doesn&apos;t exist, or it may have been moved or removed.
      </p>
      <div className="mt-6">
        <Link href="/" className="btn-primary">
          Back to Home
        </Link>
      </div>
    </div>
  );
}
