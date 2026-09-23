import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { MovieHero } from '@/components/movie/MovieHero';
import { WhereToWatch } from '@/components/movie/WhereToWatch';
import { parseMovieId } from '@/lib/filters';
import { formatYear } from '@/lib/format';
import { getMovie } from '@/lib/queries/getMovie';
import { createServerSupabase } from '@/lib/supabase/server';
import { tmdbImage } from '@/lib/tmdb-image';

type Props = { params: Promise<{ id: string }> };

// cache() evita consultar o banco duas vezes (metadados + página) na mesma requisição.
const loadMovie = cache(async (idParam: string) => {
  const id = parseMovieId(idParam);
  return id === null ? null : getMovie(createServerSupabase(), id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movie = await loadMovie((await params).id);
  if (!movie) return { title: 'Filme não encontrado' };
  const year = formatYear(movie.releaseDate);
  const image = tmdbImage(movie.backdropPath, 'w780');
  return {
    title: `${movie.title}${year ? ` (${year})` : ''} — onde assistir`,
    description: movie.overview?.slice(0, 160) ?? undefined,
    openGraph: image ? { images: [image] } : undefined,
  };
}

export default async function MoviePage({ params }: Props) {
  const movie = await loadMovie((await params).id);
  if (!movie) notFound();
  return (
    <main>
      <MovieHero movie={movie} />
      <WhereToWatch watch={movie.watch} />
    </main>
  );
}
