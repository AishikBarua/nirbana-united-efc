export function parseJsonArray(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((v) => typeof v === 'string') : [];
  } catch {
    return [];
  }
}

export function winRate(wins: number, matchesPlayed: number): number {
  if (!matchesPlayed) return 0;
  return Math.round((wins / matchesPlayed) * 100);
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
