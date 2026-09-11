import { searchPlayers } from './playerService';
import { searchMatches } from './matchService';
import { searchNews } from './newsService';

export type SearchResult = {
  type: 'player' | 'match' | 'news';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

/**
 * Site-wide search across the actual content the club tracks — players,
 * matches, news — not just the static nav-menu labels. Each domain owns its
 * own search query (see searchPlayers/searchMatches/searchNews); this just
 * fans out to all three and shapes the results into one flat, linkable list
 * for the search box in the nav menu.
 *
 * Left out on purpose: Transfers, Rankings, Standings, Gallery. None of
 * those have an individual detail page to link a search result to, so
 * including them would mean a result with nowhere useful to go.
 */
export async function siteSearch(query: string, limitPerType = 5): Promise<SearchResult[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const [players, matches, news] = await Promise.all([
    searchPlayers(q, limitPerType),
    searchMatches(q, limitPerType),
    searchNews(q, limitPerType),
  ]);

  const playerResults: SearchResult[] = players.map((p) => ({
    type: 'player',
    id: p.id,
    title: p.name,
    subtitle: `@${p.inGameId} · ${p.position}`,
    href: `/players/${p.slug ?? p.id}`,
  }));

  const matchResults: SearchResult[] = matches.map((m) => ({
    type: 'match',
    id: m.id,
    title: `Nirbana United vs ${m.opponent}`,
    subtitle:
      m.status === 'COMPLETED' && m.ourScore !== null && m.opponentScore !== null
        ? `${m.ourScore}–${m.opponentScore} · ${new Date(m.date).toLocaleDateString('en-US', { dateStyle: 'medium' })}`
        : new Date(m.date).toLocaleDateString('en-US', { dateStyle: 'medium' }),
    href: `/matches#${m.id}`,
  }));

  const newsResults: SearchResult[] = news.map((n) => ({
    type: 'news',
    id: n.id,
    title: n.title,
    subtitle: new Date(n.publishedDate).toLocaleDateString('en-US', { dateStyle: 'medium' }),
    href: `/news/${n.id}`,
  }));

  return [...playerResults, ...matchResults, ...newsResults];
}
