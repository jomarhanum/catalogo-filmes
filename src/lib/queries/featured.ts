import { getMovie } from './getMovie';
import type { Db, MovieDetails } from './types';

/** Filme mais popular que está em algum streaming e tem imagem de fundo e sinopse. */
export async function getFeaturedMovie(db: Db): Promise<MovieDetails | null> {
  const { data, error } = await db
    .from('movies')
    .select('id, movie_providers!inner(movie_id)')
    .not('backdrop_path', 'is', null)
    .not('overview', 'is', null)
    .neq('overview', '')
    .order('popularity', { ascending: false })
    .order('id')
    .limit(1);
  if (error) throw new Error(`getFeaturedMovie: ${error.message}`);
  const id = data?.[0]?.id;
  return id === undefined ? null : getMovie(db, id);
}
