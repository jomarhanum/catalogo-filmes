import type { AccessType } from '../src/lib/filters';

export interface ProviderRow {
  id: number;
  name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface GenreRow {
  id: number;
  name: string;
}

export interface MovieRow {
  id: number;
  title: string;
  original_title: string;
  overview: string | null;
  release_date: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface MovieGenreRow {
  movie_id: number;
  genre_id: number;
}

export interface MovieProviderRow {
  movie_id: number;
  provider_id: number;
  access_type: AccessType;
}

export interface MovieDetailsUpdate {
  runtime: number | null;
  backdrop_path: string | null;
  trailer_key: string | null;
  details_synced_at: string;
}

export interface MovieProviderCounts {
  /** Todas as ligações filme–streaming. */
  total: number;
  /** Ligações com last_seen_at anterior ao corte (as que a limpeza apagaria). */
  stale: number;
}

export interface CatalogRepository {
  upsertProviders(rows: ProviderRow[]): Promise<void>;
  upsertGenres(rows: GenreRow[]): Promise<void>;
  existingMovieIds(ids: number[]): Promise<Set<number>>;
  upsertMovies(rows: MovieRow[]): Promise<void>;
  upsertMovieGenres(rows: MovieGenreRow[]): Promise<void>;
  touchMovieProviders(rows: MovieProviderRow[], seenAt: string): Promise<void>;
  /** Filmes com ao menos um streaming e detalhes ausentes ou anteriores ao corte. */
  listMoviesNeedingDetails(staleBefore: string): Promise<number[]>;
  updateMovieDetails(id: number, update: MovieDetailsUpdate): Promise<void>;
  countMovieProviders(staleBefore: string): Promise<MovieProviderCounts>;
  deleteStaleMovieProviders(before: string): Promise<number>;
}
