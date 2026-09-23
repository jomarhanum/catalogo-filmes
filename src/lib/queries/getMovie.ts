import { ACCESS_TYPES, type AccessType } from '@/lib/filters';
import type { Db, MovieDetails, ProviderRef } from './types';

export async function getMovie(db: Db, id: number): Promise<MovieDetails | null> {
  const { data, error } = await db
    .from('movies')
    .select(
      `id, title, original_title, overview, release_date, runtime, vote_average,
       poster_path, backdrop_path, trailer_key,
       movie_genres ( genres ( name ) ),
       movie_providers ( access_type, providers ( id, name, logo_path, display_priority ) )`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getMovie(${id}): ${error.message}`);
  if (!data || data.movie_providers.length === 0) return null;

  const watch = Object.fromEntries(ACCESS_TYPES.map((t) => [t, [] as (ProviderRef & { priority: number })[]])) as Record<
    AccessType,
    (ProviderRef & { priority: number })[]
  >;
  for (const link of data.movie_providers) {
    const p = link.providers;
    if (p) watch[link.access_type].push({ id: p.id, name: p.name, logoPath: p.logo_path, priority: p.display_priority });
  }

  return {
    id: data.id,
    title: data.title,
    originalTitle: data.original_title,
    overview: data.overview,
    releaseDate: data.release_date,
    runtime: data.runtime,
    voteAverage: data.vote_average,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    trailerKey: data.trailer_key,
    genres: data.movie_genres
      .flatMap((g) => (g.genres ? [g.genres.name] : []))
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    watch: Object.fromEntries(
      ACCESS_TYPES.map((t) => [
        t,
        watch[t]
          .sort((a, b) => a.priority - b.priority || a.id - b.id)
          .map(({ id: providerId, name, logoPath }) => ({ id: providerId, name, logoPath })),
      ]),
    ) as Record<AccessType, ProviderRef[]>,
  };
}
