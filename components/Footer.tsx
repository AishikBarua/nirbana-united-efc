import { useTranslations } from 'next-intl';
import { Link } from '@/lib/navigation';

export default function Footer() {
  const t = useTranslations('nav');
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-gold-400/10 bg-ink-950">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="text-center sm:text-left">
            <div className="font-display text-sm font-bold tracking-wide text-gold-300">
              Nirbana United EFC
            </div>
            <div className="text-xs text-gold-100/40">Meditate. Dominate. Celebrate.</div>
          </div>
          <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 text-xs font-semibold uppercase tracking-wide text-gold-100/50">
            <Link href="/club" className="hover:text-gold-300">{t('club')}</Link>
            <Link href="/players" className="hover:text-gold-300">{t('players')}</Link>
            <Link href="/matches" className="hover:text-gold-300">{t('matches')}</Link>
            <Link href="/standings" className="hover:text-gold-300">{t('standings')}</Link>
            <Link href="/admin/login" className="hover:text-gold-300">{t('admin')}</Link>
          </div>
        </div>
        <div className="mt-6 border-t border-gold-400/10 pt-4 text-center text-[11px] text-gold-100/30">
          © {year} Nirbana United EFC. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
