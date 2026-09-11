'use client';

import { useState, useRef } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

export default function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const t = useTranslations('admin.gallery');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || 'Upload failed');
        return;
      }
      onChange(data.url);
    } catch {
      setError('Upload failed');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div>
      <label className="label-field">{label}</label>
      <div className="flex items-center gap-3">
        {value && (
          <Image
            src={value}
            alt="Preview"
            width={56}
            height={56}
            className="h-14 w-14 rounded-lg object-cover ring-1 ring-gold-400/30"
          />
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="btn-secondary text-xs disabled:opacity-60"
        >
          {uploading ? '…' : t('chooseFile')}
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-xs font-semibold text-gold-100/40 hover:text-signal-red"
          >
            ✕
          </button>
        )}
      </div>
      {error && <p className="mt-1 text-xs text-signal-red">{error}</p>}
    </div>
  );
}
