import type { TmdbVideo } from './tmdb';

const languageRank = (lang: string | null) => (lang === 'pt' ? 0 : lang === 'en' ? 1 : 2);

export function pickTrailer(videos: TmdbVideo[]): string | null {
  const trailers = videos
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
    .sort(
      (a, b) =>
        languageRank(a.iso_639_1) - languageRank(b.iso_639_1) ||
        Number(b.official) - Number(a.official) ||
        b.published_at.localeCompare(a.published_at),
    );
  return trailers[0]?.key ?? null;
}
