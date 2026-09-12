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

// Exported so other pages (e.g. the downloadable player stat card's footer
// text) can derive the site's public hostname from this one place instead
// of hardcoding it a second time.
export const SITE_URL = 'https://nirbana-united-efc.netlify.app';
const SITE_TITLE = 'Nirbana United EFC';
const SITE_DESCRIPTION =
  'Official home of Nirbana United EFC — eFootball Mobile club. Meditate. Dominate. Celebrate.';

export const metadata: Metadata = {
  // Lets Next.js turn the relative image path below into the full,
  // absolute URL that link-preview crawlers (WhatsApp, Messenger, iMessage,
  // Discord, Facebook, X/Twitter, LinkedIn, Slack, etc.) require — a relative
  // path alone would be silently ignored by most of them.
  metadataBase: new URL(SITE_URL),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  // Open Graph tags: this is what makes a pasted link show a thumbnail
  // image + title + description in chat apps and social feeds instead of
  // just plain blue text.
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_TITLE,
    type: 'website',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Nirbana United EFC — eFootball Mobile club',
      },
    ],
  },
  // Twitter/X reads its own separate tag set rather than falling back to
  // Open Graph in every client, so it's set explicitly too.
  twitter: {
    card: 'summary_large_image',
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: ['/og-image.jpg'],
  },
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
