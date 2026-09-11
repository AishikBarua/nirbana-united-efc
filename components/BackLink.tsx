import { Link } from '@/lib/navigation';

/**
 * The "back to X" link shown at the top of a detail page (a player profile,
 * a news post) — styled to match FloatingBackLink's pill design (dark
 * pill, gold border, chevron icon) so the two read as one consistent
 * control instead of two different looks. This one is static; see
 * FloatingBackLink for the version that stays reachable while scrolled down.
 */
export default function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className="mb-6 inline-flex items-center gap-2 rounded-full border border-gold-400/30 bg-ink-900/60 py-2 pl-2 pr-4 text-xs font-bold uppercase tracking-wide text-gold-200 transition hover:border-gold-400/50 hover:bg-gold-400/10"
    >
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gold-400/15">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </span>
      {label}
    </Link>
  );
}
