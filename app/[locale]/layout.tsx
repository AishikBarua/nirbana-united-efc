import type { Metadata } from 'next';
import { Cinzel, Rajdhani } from 'next/font/google';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages, unstable_setRequestLocale } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { locales } from '@/i18n';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import '../globals.css';

const display = Cinzel({
  subsets: ['latin'],
  weight: ['500', '600', '700', '900'],
  variable: '--font-display',
  display: 'swap',
});

const body = Rajdhani({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

export function generateStaticParams() {
  return locales.map((locale) => ({ locale }));
}

// This whole site reads live data on every page — match results, news,
// standings and player stats all change via admin edits and the hourly
// tracker sync, and admin pages must reflect the logged-in session. None of
// that should ever be baked into a static build (which would freeze the
// site's content as of build time and never update on its own). Setting this
// here applies to every page nested under this layout.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: 'Nirbana United EFC',
  description: 'Official home of Nirbana United EFC — eFootball Mobile club. Meditate. Dominate. Celebrate.',
};

export default async function LocaleLayout({
  children,
  params: { locale },
}: {
  children: React.ReactNode;
  params: { locale: string };
}) {
  if (!locales.includes(locale as (typeof locales)[number])) notFound();
  unstable_setRequestLocale(locale);

  const messages = await getMessages();

  return (
    <html lang={locale} className={`${display.variable} ${body.variable}`}>
      <body className="min-h-screen bg-ink-950 bg-radial-fade font-body antialiased">
        <NextIntlClientProvider messages={messages}>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
