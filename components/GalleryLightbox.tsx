'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import CommentBox from '@/components/CommentBox';

export interface GalleryItem {
  id: string;
  imageUrl: string;
  caption: string | null;
}

export default function GalleryLightbox({ images }: { images: GalleryItem[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i - 1 + images.length) % images.length)),
    [images.length]
  );
  const showNext = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % images.length)),
    [images.length]
  );

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      // The modal now holds a comment form — without this guard, typing in
      // it (e.g. pressing the arrow keys to move the cursor, or Escape to
      // dismiss an autocomplete dropdown) would instead flip to the next
      // photo or close the whole lightbox and lose the draft comment.
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;

      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, close, showPrev, showNext]);

  return (
    <>
      {/* Two tiers only (2 columns, then 4) rather than three — a middle
          3-column tier left a lone last tile stranded by itself in a mostly
          empty row whenever the image count wasn't a multiple of 3, which
          looked broken/unbalanced at tablet widths. */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {images.map((img, idx) => (
          <button
            key={img.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="card-surface group relative aspect-square overflow-hidden"
          >
            <Image
              src={img.imageUrl}
              alt={img.caption || 'Gallery image'}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={close}
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute right-4 top-4 rounded-full border border-gold-400/30 p-2 text-gold-200 hover:bg-gold-400/10"
            onClick={close}
          >
            ✕
          </button>
          <button
            type="button"
            aria-label="Previous"
            className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full border border-gold-400/30 p-3 text-gold-200 hover:bg-gold-400/10 sm:left-6"
            onClick={(e) => {
              e.stopPropagation();
              showPrev();
            }}
          >
            ‹
          </button>
          <div
            className="relative flex max-h-[85vh] w-full max-w-3xl flex-col overflow-y-auto rounded-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[4/3] w-full shrink-0">
              <Image
                src={images[activeIndex].imageUrl}
                alt={images[activeIndex].caption || 'Gallery image'}
                fill
                sizes="100vw"
                className="rounded-xl object-contain"
              />
            </div>
            {images[activeIndex].caption && (
              <div className="mt-3 text-center text-sm text-gold-100/70">{images[activeIndex].caption}</div>
            )}

            <div className="mt-6 text-left">
              <CommentBox targetType="GALLERY" targetId={images[activeIndex].id} />
            </div>
          </div>
          <button
            type="button"
            aria-label="Next"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full border border-gold-400/30 p-3 text-gold-200 hover:bg-gold-400/10 sm:right-6"
            onClick={(e) => {
              e.stopPropagation();
              showNext();
            }}
          >
            ›
          </button>
        </div>
      )}
    </>
  );
}
