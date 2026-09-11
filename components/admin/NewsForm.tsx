'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';
import ImageUploadField from './ImageUploadField';
import type { News } from '@prisma/client';

function toDateInputValue(date: Date | string): string {
  return new Date(date).toISOString().slice(0, 10);
}

export default function NewsForm({ post }: { post?: News }) {
  const t = useTranslations('admin.news');
  const tc = useTranslations('common');
  const router = useRouter();

  const [form, setForm] = useState({
    title: post?.title || '',
    body: post?.body || '',
    imageUrl: post?.imageUrl || '',
    publishedDate: post ? toDateInputValue(post.publishedDate) : toDateInputValue(new Date()),
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  function set<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const res = await fetch(post ? `/api/news/${post.id}` : '/api/news', {
        method: post ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        setError(tc('error'));
        return;
      }
      router.push('/admin/news');
      router.refresh();
    } catch {
      setError(tc('error'));
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="card-surface space-y-4 p-6">
      <div>
        <label className="label-field">{t('postTitle')}</label>
        <input required className="input-field" value={form.title} onChange={(e) => set('title', e.target.value)} />
      </div>
      <div>
        <label className="label-field">{t('publishedDate')}</label>
        <input type="date" className="input-field" value={form.publishedDate} onChange={(e) => set('publishedDate', e.target.value)} />
      </div>
      <ImageUploadField label={t('image')} value={form.imageUrl} onChange={(url) => set('imageUrl', url)} />
      <div>
        <label className="label-field">{t('body')}</label>
        <textarea required rows={8} className="input-field" value={form.body} onChange={(e) => set('body', e.target.value)} />
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={saving} className="btn-primary disabled:opacity-60">
          {saving ? '…' : tc('save')}
        </button>
        <button type="button" onClick={() => router.push('/admin/news')} className="btn-secondary">
          {tc('cancel')}
        </button>
      </div>
    </form>
  );
}
