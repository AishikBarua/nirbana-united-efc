'use client';

import { useState, FormEvent } from 'react';
import { useTranslations } from 'next-intl';

export default function ChangePasswordForm() {
  const t = useTranslations('admin.settings');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (newPassword.length < 8) {
      setError(t('tooShort'));
      return;
    }
    if (newPassword !== confirmPassword) {
      setError(t('mismatch'));
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (res.status === 429) {
        setError(t('tooManyAttempts'));
        return;
      }
      if (res.status === 401) {
        setError(t('wrongCurrent'));
        return;
      }
      if (!res.ok) {
        setError(t('genericError'));
        return;
      }

      setSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch {
      setError(t('genericError'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="label-field" htmlFor="currentPassword">{t('currentPassword')}</label>
        <input
          id="currentPassword"
          type="password"
          required
          autoComplete="current-password"
          className="input-field"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
        />
      </div>
      <div>
        <label className="label-field" htmlFor="newPassword">{t('newPassword')}</label>
        <input
          id="newPassword"
          type="password"
          required
          minLength={8}
          autoComplete="new-password"
          className="input-field"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
        />
        <p className="mt-1 text-[11px] text-gold-100/40">{t('newPasswordHint')}</p>
      </div>
      <div>
        <label className="label-field" htmlFor="confirmPassword">{t('confirmPassword')}</label>
        <input
          id="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          className="input-field"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
        />
      </div>

      {error && <p className="text-sm text-signal-red">{error}</p>}
      {success && <p className="text-sm text-signal-green">{t('success')}</p>}

      <button type="submit" disabled={loading} className="btn-primary w-full disabled:opacity-60">
        {loading ? '…' : t('submit')}
      </button>
    </form>
  );
}
