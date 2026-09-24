export type TmdbImageSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280';

export function tmdbImage(path: string | null, size: TmdbImageSize): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
