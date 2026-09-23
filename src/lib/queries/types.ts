import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessType } from '@/lib/filters';
import type { Database } from '@/lib/supabase/database.types';

export type Db = SupabaseClient<Database>;

export interface ProviderRef {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface GenreRef {
  id: number;
  name: string;
}

export interface MovieCardData {
  id: number;
  title: string;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number;
  posterPath: string | null;
  providers: ProviderRef[];
}

export interface SearchResult {
  movies: MovieCardData[];
  total: number;
}

export interface MovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey: string | null;
  genres: string[];
  watch: Record<AccessType, ProviderRef[]>;
}
