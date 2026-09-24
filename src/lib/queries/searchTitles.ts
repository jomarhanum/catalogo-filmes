import { PAGE_SIZE, toSearchResult } from './searchMovies';
import type { Db, SearchResult } from './types';

export async function searchTitles(db: Db, query: string, offset: number): Promise<SearchResult> {
  const { data, error } = await db.rpc('search_titles', { p_query: query, p_limit: PAGE_SIZE, p_offset: offset });
  if (error) throw new Error(`search_titles: ${error.message}`);
  return toSearchResult(data ?? []);
}
