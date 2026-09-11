import Image from 'next/image';

/**
 * Single source of truth for rendering a player's photo (or a text-initial
 * fallback when no photo is set).
 *
 * Always render this inside a parent that is `relative` and has a defined
 * size or aspect ratio (e.g. `relative h-32 w-32` or `relative aspect-[4/3]`).
 * This component fills that parent with `fill` + `object-cover`, which is
 * the only safe pattern for next/image when the box's aspect ratio and the
 * source photo's aspect ratio can differ (a bug we hit before: mixing an
 * explicit width/height with CSS-forced sizing caused photos to render as
 * two mismatched crops stacked on top of each other).
 */
export default function PlayerPhoto({
  photoUrl,
  name,
  sizes,
  imageClassName = '',
  fallbackClassName = 'text-4xl',
  priority = false,
}: {
  photoUrl?: string | null;
  name: string;
  /** Required: tell the browser how large this image will actually render, e.g. "160px" or "(max-width: 640px) 100vw, 300px". */
  sizes: string;
  /** Extra classes for the <Image> itself, e.g. hover-zoom transitions. `object-cover` is always applied. */
  imageClassName?: string;
  /** Extra classes for the fallback initial (font size, color). */
  fallbackClassName?: string;
  priority?: boolean;
}) {
  if (!photoUrl) {
    return (
      <div
        className={`flex h-full w-full items-center justify-center font-display font-bold text-gold-400/30 ${fallbackClassName}`}
      >
        {name.charAt(0)}
      </div>
    );
  }

  return (
    <Image
      src={photoUrl}
      alt={name}
      fill
      sizes={sizes}
      priority={priority}
      className={`object-cover ${imageClassName}`}
    />
  );
}
