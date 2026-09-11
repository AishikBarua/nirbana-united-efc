'use client';

import { useState, FormEvent, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

export default function GalleryUploadForm() {
  const t = useTranslations('admin.gallery');
  const tc = useTranslations('common');
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [caption, setCaption] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Please choose an image.');
      return;
    }
    setSaving(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const uploadRes = await fetch('/api/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) {
        setError(uploadData.error || tc('error'));
        return;
      }

      const res = await fetch('/api/gallery', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl: uploadData.url, caption }),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }

      setCaption('');
      if (fileRef.current) fileRef.current.value = '';
      router.refresh();
    } catch {
      setError(tc('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label-field">{t('upload')}</label>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="text-sm text-gold-100/70" />
      </div>
      <div className="flex-1 min-w-[160px]">
        <label className="label-field">{t('caption')}</label>
        <input className="input-field" value={caption} onChange={(e) => setCaption(e.target.value)} />
      </div>
      {error && <p className="w-full text-sm text-signal-red">{error}</p>}
      <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
        {saving ? '…' : tc('add')}
      </button>
    </form>
  );
}
