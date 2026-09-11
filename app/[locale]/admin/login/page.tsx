'use client';

import { useState, FormEvent } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/lib/navigation';

export default function AdminLoginPage() {
  const t = useTranslations('admin.login');
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      if (res.status === 429) {
        setError(t('tooManyAttempts'));
        return;
      }
      if (!res.ok) {
        setError(t('invalidCredentials'));
        return;
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch {
      setError(t('invalidCredentials'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col items-center justify-center px-4 py-12">
      <Image
        src="/brand/crest.jpg"
        alt="Nirbana United EFC crest"
        width={72}
        height={72}
        className="mb-6 h-16 w-16 rounded-full ring-2 ring-gold-400/40"
      />
      <div className="w-full card-surface p-6">
        <h1 className="font-display text-xl font-bold text-gold-100">{t('title')}</h1>
        <p className="mb-6 mt-1 text-sm text-gold-100/50">{t('subtitle')}</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label-field" htmlFor="email">{t('email')}</label>
            <input
              id="email"
              type="email"
              required
              autoComplete="username"
              className="input-field"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label-field" htmlFor="password">{t('password')}</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              className="input-field"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-signal-red">{error}</p>}

          <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
            {loading ? '…' : t('submit')}
          </button>
        </form>
      </div>
    </div>
  );
}
