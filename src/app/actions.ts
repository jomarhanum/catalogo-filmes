'use server';

import { parseFilters, parseOffset, parseSearchQuery } from '@/lib/filters';
import { searchMovies } from '@/lib/queries/searchMovies';
import { searchTitles } from '@/lib/queries/searchTitles';
import type { MovieCardData } from '@/lib/queries/types';
import { createServerSupabase } from '@/lib/supabase/server';

// Server Actions são endpoints públicos: revalidamos tudo o que chega.
export async function loadMoreMovies(query: string, offset: number): Promise<MovieCardData[]> {
  const filters = parseFilters(Object.fromEntries(new URLSearchParams(typeof query === 'string' ? query : '')));
  const { movies } = await searchMovies(createServerSupabase(), filters, parseOffset(offset));
  return movies;
}

export async function loadMoreSearch(query: string, offset: number): Promise<MovieCardData[]> {
  const term = parseSearchQuery(typeof query === 'string' ? query : undefined);
  if (!term) return [];
  const { movies } = await searchTitles(createServerSupabase(), term, parseOffset(offset));
  return movies;
}
