import RippleLoader from '@/components/RippleLoader';

// Next.js's special loading.tsx file: automatically shown as the Suspense
// fallback for everything under this route segment — both client-side
// navigation between pages and a page's own server-side data fetching —
// so every page under app/[locale]/ gets this instead of a blank screen
// while it loads, with zero per-page wiring needed.
export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center px-4">
      <RippleLoader />
    </div>
  );
}
