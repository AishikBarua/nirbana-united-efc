/**
 * Site-wide loading indicator — three gold rings pulsing outward around the
 * club crest. Rendered automatically by app/[locale]/loading.tsx, which
 * Next.js shows as the Suspense fallback for this route segment during
 * client-side navigation and server data fetching, replacing what used to
 * be a blank screen while a page's data loaded.
 *
 * Pure CSS animation (no client JS/hooks needed), so this stays a plain
 * Server Component — it can render as part of the fallback boundary
 * without shipping any extra client bundle.
 */

import Image from 'next/image';

export default function RippleLoader({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4" role="status" aria-live="polite">
      <div className="relative flex h-24 w-24 items-center justify-center">
        <span className="ripple-loader-ring" style={{ animationDelay: '0s' }} />
        <span className="ripple-loader-ring" style={{ animationDelay: '0.6s' }} />
        <span className="ripple-loader-ring" style={{ animationDelay: '1.2s' }} />
        <div className="relative z-10 h-12 w-12 overflow-hidden rounded-full border-2 border-gold-400 shadow-gold">
          <Image src="/brand/crest.jpg" alt="" width={48} height={48} className="h-full w-full object-cover" />
        </div>
      </div>
      {label && <p className="text-xs font-semibold uppercase tracking-wide text-gold-200/70">{label}</p>}
      <span className="sr-only">Loading…</span>

      <style>{`
        .ripple-loader-ring {
          position: absolute;
          inset: 0;
          border-radius: 9999px;
          border: 2px solid #d4a339;
          opacity: 0;
          animation: ripple-loader-pulse 1.8s cubic-bezier(0.2, 0.6, 0.4, 1) infinite;
        }
        @keyframes ripple-loader-pulse {
          0% {
            transform: scale(0.4);
            opacity: 0.7;
          }
          100% {
            transform: scale(1.4);
            opacity: 0;
          }
        }
        @media (prefers-reduced-motion: reduce) {
          .ripple-loader-ring {
            animation: none;
            opacity: 0.25;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
