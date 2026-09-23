'use server';

import { parseFilters, parseOffset } from '@/lib/filters';
import { searchMovies } from '@/lib/queries/searchMovies';
import type { MovieCardData } from '@/lib/queries/types';
import { createServerSupabase } from '@/lib/supabase/server';

// Server Actions são endpoints públicos: revalidamos tudo o que chega.
export async function loadMoreMovies(query: string, offset: number): Promise<MovieCardData[]> {
  const filters = parseFilters(Object.fromEntries(new URLSearchParams(typeof query === 'string' ? query : '')));
  const { movies } = await searchMovies(createServerSupabase(), filters, parseOffset(offset));
  return movies;
}
