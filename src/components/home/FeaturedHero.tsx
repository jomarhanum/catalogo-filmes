import Image from 'next/image';
import { FilmLink } from '@/components/FilmLink';
import { ProviderLogo } from '@/components/ProviderLogo';
import { TrailerModal } from '@/components/movie/TrailerModal';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import { uniqueProviders } from '@/lib/providers';
import type { MovieDetails } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';

export function FeaturedHero({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const providers = uniqueProviders(movie.watch);
  const facts = [formatYear(movie.releaseDate), formatRuntime(movie.runtime)].filter((v): v is string => Boolean(v));

  return (
    <section aria-label="Filme em destaque" className="relative isolate -mt-16 flex min-h-[60vh] items-end sm:min-h-[80vh]">
      {backdrop && (
        <Image src={backdrop} alt="" fill preload sizes="100vw" className="-z-10 object-cover object-top" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-bg via-bg/60 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/10 to-transparent" />
      <div className="w-full px-4 pb-32 pt-24 sm:px-8 sm:pb-44">
        <div className="max-w-xl">
          <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight sm:text-6xl">
            {movie.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg/90 sm:text-base">
            {facts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
            <span>
              <span className="text-star">★</span> {formatRating(movie.voteAverage)}
            </span>
            {providers.length > 0 && (
              <span className="flex gap-1.5">
                {providers.map((p) => (
                  <ProviderLogo key={p.id} provider={p} size={26} />
                ))}
              </span>
            )}
          </div>
          {movie.overview && <p className="mt-4 line-clamp-3 text-base text-fg/90 sm:text-lg">{movie.overview}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {movie.trailerKey && (
              <TrailerModal
                trailerKey={movie.trailerKey}
                title={movie.title}
                triggerLabel="Assistir trailer"
                triggerClassName="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 font-semibold text-black hover:bg-white/80"
              />
            )}
            <FilmLink
              href={`/filme/${movie.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white/25 px-6 py-2.5 font-semibold text-white hover:bg-white/35"
            >
              Ver detalhes
            </FilmLink>
          </div>
        </div>
      </div>
    </section>
  );
}
