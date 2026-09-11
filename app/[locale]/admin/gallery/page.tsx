import Image from 'next/image';
import { getTranslations, unstable_setRequestLocale } from 'next-intl/server';
import { listGalleryImages } from '@/lib/services/galleryService';
import AdminNav from '@/components/admin/AdminNav';
import DeleteButton from '@/components/admin/DeleteButton';
import GalleryUploadForm from '@/components/admin/GalleryUploadForm';

export default async function AdminGalleryPage({ params: { locale } }: { params: { locale: string } }) {
  unstable_setRequestLocale(locale);
  const t = await getTranslations('admin.gallery');

  const images = await listGalleryImages();

  return (
    <div>
      <AdminNav />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <h1 className="mb-6 font-display text-2xl font-bold text-gold-100">{t('title')}</h1>

        <div className="mb-8">
          <GalleryUploadForm />
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((img) => (
            <div key={img.id} className="card-surface overflow-hidden">
              <div className="relative aspect-square w-full">
                <Image src={img.imageUrl} alt={img.caption || ''} fill sizes="200px" className="object-cover" />
              </div>
              <div className="flex items-center justify-between gap-2 p-2">
                <span className="truncate text-xs text-gold-100/50">{img.caption || '—'}</span>
                <DeleteButton endpoint={`/api/gallery/${img.id}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
