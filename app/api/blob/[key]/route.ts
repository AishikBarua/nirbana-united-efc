import { NextRequest, NextResponse } from 'next/server';

// Every route here reads or writes live data (or both) — never safe to
// let Next.js statically cache or prerender it at build time.
export const dynamic = 'force-dynamic';

// Serves an image previously saved to Netlify Blobs by
// lib/services/uploadService.ts's saveUploadedImage(). Only meaningful when
// actually running on Netlify (local dev never writes to Blobs — see that
// file — so this route always 404s locally, which is fine since it's never
// linked to from a locally-uploaded image's URL).
//
// Detected via NETLIFY_BLOBS_CONTEXT, not NETLIFY — see uploadService.ts's
// saveUploadedImage() for why: NETLIFY is a build-time-only variable, so
// checking it here would make this route 404 on every real deployed
// request too.
//
// @netlify/blobs is dynamically imported (not a top-level import) so local
// `npm run dev` never needs that package installed at all — the import is
// only ever reached in the one branch that can actually run, on Netlify,
// where package.json's dependency is always freshly installed at build time.
export async function GET(_request: NextRequest, { params }: { params: { key: string } }) {
  if (!process.env.NETLIFY_BLOBS_CONTEXT) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  try {
    const { getStore } = await import('@netlify/blobs');
    const store = getStore('image-uploads');

    const result = await store.getWithMetadata(params.key, { type: 'arrayBuffer' });
    if (!result || !result.data) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    const contentType = (result.metadata?.contentType as string | undefined) || 'application/octet-stream';

    return new NextResponse(result.data, {
      headers: {
        'Content-Type': contentType,
        // The key is a random UUID (see uploadService.ts) — a given key's
        // content never changes, so this is safe to cache indefinitely.
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[blob] failed to serve', params.key, error);
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
}
