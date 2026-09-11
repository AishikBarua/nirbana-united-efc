import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./i18n.ts');

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
      },
    ],
  },
  // Lets instrumentation.ts run once when the server starts — that's what
  // kicks off the hourly background tracker sync (see lib/autoSync.ts).
  // Next.js 14 still needs this flag; it becomes the default in Next 15+.
  experimental: {
    instrumentationHook: true,
  },
};

export default withNextIntl(nextConfig);
