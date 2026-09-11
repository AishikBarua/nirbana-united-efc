'use client';

import { useLocale, useTranslations } from 'next-intl';
import { usePathname, useRouter } from '@/lib/navigation';
import { locales } from '@/i18n';

export default function LocaleSwitcher() {
  const locale = useLocale();
  const t = useTranslations('locale');
  const pathname = usePathname();
  const router = useRouter();

  return (
    <div className="flex items-center overflow-hidden rounded-full border border-gold-400/25 text-xs font-semibold">
      {locales.map((l) => (
        <button
          key={l}
          type="button"
          onClick={() => router.replace(pathname, { locale: l })}
          aria-current={locale === l}
          className={`px-2.5 py-1.5 transition ${
            locale === l ? 'bg-gold-400 text-ink-950' : 'bg-transparent text-gold-200 hover:bg-gold-400/10'
          }`}
        >
          {t(l)}
        </button>
      ))}
    </div>
  );
}
