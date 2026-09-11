import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { listGalleryImages } from '@/lib/services/galleryService';
import SectionHeading from '@/components/SectionHeading';
import GalleryLightbox from '@/components/GalleryLightbox';

export default async function GalleryPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('gallery');

  const images = await listGalleryImages();

  return (
    <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <SectionHeading title={t('title')} />
      {images.length > 0 ? (
        <GalleryLightbox images={images} />
      ) : (
        <p className="text-sm text-gold-100/50">{t('noImages')}</p>
      )}
    </div>
  );
}
