import Image from 'next/image';
import Link from 'next/link';
import { ProviderLogo } from '@/components/ProviderLogo';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import type { MovieCardData } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';

export function MovieCard({ movie }: { movie: MovieCardData }) {
  const poster = tmdbImage(movie.posterPath, 'w342');
  const meta = [formatYear(movie.releaseDate), formatRuntime(movie.runtime)].filter(Boolean).join(' · ');

  return (
    <Link href={`/filme/${movie.id}`} data-testid="movie-card" className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface">
        {poster && (
          <Image
            src={poster}
            alt={`Pôster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover transition group-hover:scale-105"
          />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-bold text-accent">
          ★ {formatRating(movie.voteAverage)}
        </span>
      </div>
      <h3 className="mt-2 truncate text-sm font-semibold">{movie.title}</h3>
      {meta && <p className="text-xs text-muted">{meta}</p>}
      <div className="mt-1 flex gap-1">
        {movie.providers.slice(0, 4).map((p) => (
          <ProviderLogo key={p.id} provider={p} size={20} />
        ))}
      </div>
    </Link>
  );
}
