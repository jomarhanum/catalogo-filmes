import Image from 'next/image';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import type { MovieDetails } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';
import { BackLink } from './BackLink';
import { TrailerEmbed } from './TrailerEmbed';
import { WhereToWatch } from './WhereToWatch';

export function MovieDetailsView({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const poster = tmdbImage(movie.posterPath, 'w500');
  const facts = [formatYear(movie.releaseDate), formatRuntime(movie.runtime)].filter((v): v is string => Boolean(v));

  return (
    <article className="relative isolate">
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
          <Image src={backdrop} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-30 blur-md" />
          <div className="absolute inset-0 bg-linear-to-b from-bg/40 via-bg/80 to-bg" />
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-8">
        <BackLink />
        <div className="mt-6 grid gap-8 sm:grid-cols-[240px_minmax(0,1fr)]">
          <div
            data-testid="movie-poster"
            className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-lg bg-surface shadow-2xl sm:mx-0 sm:w-full"
          >
            {poster && <Image src={poster} alt={`Pôster de ${movie.title}`} fill sizes="240px" className="object-cover" />}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-[44px]">
              {movie.title}
            </h1>
            <ul aria-label="Informações" className="mt-4 flex flex-wrap gap-2 text-sm">
              <li className="rounded-md bg-surface px-2.5 py-1">
                <span className="text-star">★</span> {formatRating(movie.voteAverage)}
              </li>
              {facts.map((fact) => (
                <li key={fact} className="rounded-md bg-surface px-2.5 py-1">
                  {fact}
                </li>
              ))}
            </ul>
            {movie.genres.length > 0 && (
              <ul aria-label="Gêneros" className="mt-3 flex flex-wrap gap-2 text-xs">
                {movie.genres.map((genre) => (
                  <li key={genre} className="rounded-full border border-border px-3 py-1 text-fg/80">
                    {genre}
                  </li>
                ))}
              </ul>
            )}
            {movie.overview && <p className="mt-5 max-w-prose leading-relaxed text-fg/90">{movie.overview}</p>}
            <WhereToWatch watch={movie.watch} />
            {movie.trailerKey && <TrailerEmbed trailerKey={movie.trailerKey} title={movie.title} />}
          </div>
        </div>
      </div>
    </article>
  );
}
