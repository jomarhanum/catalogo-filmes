import Image from 'next/image';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import type { MovieDetails } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';
import { BackLink } from './BackLink';
import { TrailerModal } from './TrailerModal';

export function MovieHero({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const poster = tmdbImage(movie.posterPath, 'w500');
  const meta = [formatYear(movie.releaseDate), formatRuntime(movie.runtime), movie.genres.join(', ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="relative isolate">
      {backdrop && (
        <div className="absolute inset-0 -z-10">
          <Image src={backdrop} alt="" fill priority className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-linear-to-b from-bg/30 via-bg/70 to-bg" />
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-4">
        <BackLink />
        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg bg-surface shadow-2xl sm:w-56">
            {poster && <Image src={poster} alt={`Pôster de ${movie.title}`} fill className="object-cover" />}
          </div>
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {meta && <span>{meta}</span>}
              {meta && ' · '}
              <span className="font-bold text-star">★ {formatRating(movie.voteAverage)}</span>
            </p>
            {movie.overview && <p className="mt-3 leading-relaxed text-fg/90">{movie.overview}</p>}
            {movie.trailerKey && <TrailerModal trailerKey={movie.trailerKey} title={movie.title} />}
          </div>
        </div>
      </div>
    </section>
  );
}
