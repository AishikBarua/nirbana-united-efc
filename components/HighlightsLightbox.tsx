'use client';

import { useState, useCallback, useEffect } from 'react';
import Image from 'next/image';
import { useFormatter } from 'next-intl';

export interface HighlightItem {
  id: string;
  imageUrl: string;
  caption: string | null;
  matchOpponent: string | null;
  matchDate: string | null; // ISO string
  matchScore: string | null;
  matchCompetition: string | null;
}

export default function HighlightsLightbox({ highlights }: { highlights: HighlightItem[] }) {
  const format = useFormatter();
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const close = useCallback(() => setActiveIndex(null), []);
  const showPrev = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i - 1 + highlights.length) % highlights.length)),
    [highlights.length]
  );
  const showNext = useCallback(
    () => setActiveIndex((i) => (i === null ? null : (i + 1) % highlights.length)),
    [highlights.length]
  );

  useEffect(() => {
    if (activeIndex === null) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowLeft') showPrev();
      if (e.key === 'ArrowRight') showNext();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeIndex, close, showPrev, showNext]);

  const active = activeIndex !== null ? highlights[activeIndex] : null;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {highlights.map((h, idx) => (
          <button
            key={h.id}
            type="button"
            onClick={() => setActiveIndex(idx)}
            className="card-surface group relative aspect-square overflow-hidden"
          >
            <Image
              src={h.imageUrl}
              alt={h.caption || 'Match highlight'}
              fill
              sizes="(max-width: 640px) 50vw, 25vw"
              className="object-cover transition duration-300 group-hover:scale-105"
            />
            {h.matchOpponent && (
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 py-1.5 text-left text-[10px] font-semibold text-gold-100/90">
                vs {h.matchOpponent} {h.matchScore ? `(${h.matchScore})` : ''}
              </div>
            )}
          </button>
        ))}
      </div>

      {active && (
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
              <Image src={active.imageUrl} alt={active.caption || 'Match highlight'} fill sizes="100vw" className="rounded-xl object-contain" />
            </div>
            {active.caption && <div className="mt-3 text-center text-sm text-gold-100/70">{active.caption}</div>}
            {active.matchOpponent && (
              <div className="mt-1 text-center text-xs text-gold-100/40">
                vs {active.matchOpponent}
                {active.matchScore ? ` · ${active.matchScore}` : ''}
                {active.matchDate ? ` · ${format.dateTime(new Date(active.matchDate), { dateStyle: 'medium' })}` : ''}
                {active.matchCompetition ? ` · ${active.matchCompetition}` : ''}
              </div>
            )}
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
