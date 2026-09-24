import type { CatalogFilters } from '@/lib/filters';
import type { Db, ProviderRef, SearchResult } from './types';

export const PAGE_SIZE = 24;

interface RawProvider {
  id: number;
  name: string;
  logo_path: string | null;
}

/** Linha devolvida por search_movies e search_titles (mesmas colunas). */
export interface SearchRow {
  id: number;
  title: string;
  release_date: string | null;
  runtime: number | null;
  vote_average: number;
  poster_path: string | null;
  providers: unknown;
  total_count: number;
}

export function toSearchResult(rows: SearchRow[]): SearchResult {
  return {
    total: rows[0]?.total_count ?? 0,
    movies: rows.map((row) => ({
      id: row.id,
      title: row.title,
      releaseDate: row.release_date,
      runtime: row.runtime,
      voteAverage: row.vote_average,
      posterPath: row.poster_path,
      providers: (row.providers as RawProvider[]).map(
        (p): ProviderRef => ({ id: p.id, name: p.name, logoPath: p.logo_path }),
      ),
    })),
  };
}

export async function searchMovies(
  db: Db,
  filters: CatalogFilters,
  offset: number,
  limit: number = PAGE_SIZE,
): Promise<SearchResult> {
  const { data, error } = await db.rpc('search_movies', {
    p_providers: filters.providers.length ? filters.providers : undefined,
    p_access: filters.access.length ? filters.access : undefined,
    p_genres: filters.genres.length ? filters.genres : undefined,
    p_year_min: filters.yearMin ?? undefined,
    p_year_max: filters.yearMax ?? undefined,
    p_min_rating: filters.minRating ?? undefined,
    p_max_runtime: filters.maxRuntime ?? undefined,
    p_language: filters.language ?? undefined,
    p_sort: filters.sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(`search_movies: ${error.message}`);
  return toSearchResult(data ?? []);
}
