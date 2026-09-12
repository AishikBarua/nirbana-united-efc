/**
 * Minimal, dependency-free User-Agent parser for the visitor analytics
 * feature (see prisma's SiteVisit model and app/api/track/route.ts).
 *
 * This is intentionally hand-rolled instead of pulling in a library like
 * ua-parser-js: the analytics feature is a "nice to have" for the admin
 * dashboard, not something the public site depends on to function, so it's
 * not worth adding a new dependency (and the maintenance/security surface
 * that comes with one) just for a rough browser/OS/device-type guess. The
 * output only needs to be good enough to group visits into a handful of
 * readable buckets on the admin dashboard — not byte-perfect UA parsing.
 */

export interface ParsedUserAgent {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'bot' | 'unknown';
}

const BOT_RE = /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|whatsapp|telegrambot|discordbot|pingdom|uptimerobot|ahrefs|semrush|petalbot/i;

function detectBrowser(ua: string): string {
  // Order matters: several browsers include other engines' tokens in their
  // UA string (e.g. Edge and Opera both include "Chrome"), so the more
  // specific/newer browser must be checked first.
  if (/EdgA|EdgiOS|Edge\//i.test(ua) || /\bEdg\//i.test(ua)) return 'Edge';
  if (/OPR\/|Opera/i.test(ua)) return 'Opera';
  if (/SamsungBrowser/i.test(ua)) return 'Samsung Internet';
  if (/CriOS/i.test(ua)) return 'Chrome'; // Chrome on iOS
  if (/FxiOS/i.test(ua)) return 'Firefox'; // Firefox on iOS
  if (/Chrome\//i.test(ua)) return 'Chrome';
  if (/Firefox\//i.test(ua)) return 'Firefox';
  if (/Safari\//i.test(ua) && /Version\//i.test(ua)) return 'Safari';
  if (/MSIE|Trident/i.test(ua)) return 'Internet Explorer';
  return 'Other';
}

function detectOS(ua: string): string {
  if (/Windows NT/i.test(ua)) return 'Windows';
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS';
  if (/Android/i.test(ua)) return 'Android';
  if (/Mac OS X/i.test(ua)) return 'macOS';
  if (/CrOS/i.test(ua)) return 'Chrome OS';
  if (/Linux/i.test(ua)) return 'Linux';
  return 'Other';
}

function detectDeviceType(ua: string): ParsedUserAgent['deviceType'] {
  if (BOT_RE.test(ua)) return 'bot';
  if (/iPad|Tablet(?!.*Mobile)/i.test(ua)) return 'tablet';
  // Some Android tablets omit "Mobile" from their UA; treat "Android" +
  // absence of "Mobile" as a tablet, and "Android" + "Mobile" as a phone.
  if (/Android/i.test(ua) && !/Mobile/i.test(ua)) return 'tablet';
  if (/Mobi|iPhone|iPod|Android/i.test(ua)) return 'mobile';
  return 'desktop';
}

export function parseUserAgent(userAgent: string | null | undefined): ParsedUserAgent {
  const ua = userAgent || '';
  if (!ua) return { browser: 'Other', os: 'Other', deviceType: 'unknown' };
  return {
    browser: detectBrowser(ua),
    os: detectOS(ua),
    deviceType: detectDeviceType(ua),
  };
}

/** True for known search-engine/social-preview crawlers — used to keep bot
 * traffic out of the visit log entirely, so it never inflates the admin's
 * visitor counts. */
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return BOT_RE.test(userAgent);
}
