export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

/**
 * A draw counts as half a win — the same convention already used by the
 * matches page's own stat block and by the tracker-sync-generated player
 * bio text (see lib/trackerSync.ts). `draws` defaults to 0 so a caller with
 * no draws figure to hand still gets a sane result, but every caller that
 * has one should pass it: before this took `draws` into account, a
 * player's "Win Rate" stat tile could show a different number than the
 * "X% win rate" mentioned a few lines below in their own bio, for the
 * exact same underlying record — same wins/draws/losses, two different
 * displayed percentages on the same page.
 */
export function winRate(wins: number, matchesPlayed: number, draws = 0): number {
  if (!matchesPlayed) return 0;
  return Math.round(((wins + draws / 2) / matchesPlayed) * 100);
}

export function matchResultForUs(ourScore: number | null, opponentScore: number | null): 'W' | 'D' | 'L' | null {
  if (ourScore === null || opponentScore === null || ourScore === undefined || opponentScore === undefined) {
    return null;
  }
  if (ourScore > opponentScore) return 'W';
  if (ourScore < opponentScore) return 'L';
  return 'D';
}

/** Very small allowlist-based sanitizer for the "notes"/"body" free text fields:
 * we never render these with dangerouslySetInnerHTML, so no HTML escaping is
 * needed beyond what React already does — this just normalizes line breaks
 * for display via a helper class ("whitespace-pre-line").
 */
export function safeMultiline(text: string | null | undefined): string {
  return (text || '').replace(/\r\n/g, '\n');
}
