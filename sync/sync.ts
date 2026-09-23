import { ACCESS_TYPES } from '../src/lib/filters';
import { mapWithConcurrency } from './pool';
import type { CatalogRepository, MovieRow, ProviderRow } from './repository';
import { scanDiscover } from './scan';
import { TmdbError, type TmdbClient, type TmdbMovie, type TmdbProvider } from './tmdb';
import { pickTrailer } from './trailer';

const DETAILS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface SyncSummary {
  added: number;
  updated: number;
  unlinked: number;
  detailsFetched: number;
  detailsSkipped: number;
}

export interface SyncDeps {
  tmdb: TmdbClient;
  repo: CatalogRepository;
  now?: () => Date;
  log?: (msg: string) => void;
  detailsConcurrency?: number;
}

function toProviderRow(p: TmdbProvider): ProviderRow {
  return {
    id: p.provider_id,
    name: p.provider_name,
    logo_path: p.logo_path,
    display_priority: p.display_priorities?.BR ?? p.display_priority,
  };
}

function toMovieRow(m: TmdbMovie): MovieRow {
  return {
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    overview: m.overview || null,
    release_date: m.release_date || null,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    popularity: m.popularity,
    original_language: m.original_language,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
  };
}

export async function runSync(deps: SyncDeps): Promise<SyncSummary> {
  const { tmdb, repo } = deps;
  const log = deps.log ?? (() => {});
  const now = (deps.now ?? (() => new Date()))();
  const runStartedAt = now.toISOString();
  const summary: SyncSummary = { added: 0, updated: 0, unlinked: 0, detailsFetched: 0, detailsSkipped: 0 };

  // 1. Referências
  const providers = await tmdb.getProviders();
  await repo.upsertProviders(providers.map(toProviderRow));
  const genres = await tmdb.getGenres();
  await repo.upsertGenres(genres);
  const knownGenres = new Set(genres.map((g) => g.id));
  log(`${providers.length} streamings, ${genres.length} gêneros`);

  // 2. Varredura
  const seen = new Set<number>();
  for (const provider of providers) {
    for (const accessType of ACCESS_TYPES) {
      await scanDiscover(
        tmdb,
        { providerId: provider.provider_id, accessType },
        async (pageMovies) => {
          const movies = [...new Map(pageMovies.map((m) => [m.id, m])).values()];
          if (movies.length === 0) return;

          const existing = await repo.existingMovieIds(movies.map((m) => m.id));
          for (const m of movies) {
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            if (existing.has(m.id)) summary.updated++;
            else summary.added++;
          }

          await repo.upsertMovies(movies.map(toMovieRow));
          await repo.upsertMovieGenres(
            movies.flatMap((m) =>
              m.genre_ids.filter((g) => knownGenres.has(g)).map((genreId) => ({ movie_id: m.id, genre_id: genreId })),
            ),
          );
          await repo.touchMovieProviders(
            movies.map((m) => ({ movie_id: m.id, provider_id: provider.provider_id, access_type: accessType })),
            runStartedAt,
          );
        },
        { log },
      );
    }
  }
  log(`varredura: ${summary.added} novos, ${summary.updated} atualizados`);

  // 3. Detalhes
  const staleBefore = new Date(now.getTime() - DETAILS_MAX_AGE_MS).toISOString();
  const needingDetails = await repo.listMoviesNeedingDetails(staleBefore);
  await mapWithConcurrency(needingDetails, deps.detailsConcurrency ?? 10, async (id) => {
    try {
      const details = await tmdb.getDetails(id);
      await repo.updateMovieDetails(id, {
        runtime: details.runtime || null,
        backdrop_path: details.backdrop_path,
        trailer_key: pickTrailer(details.videos?.results ?? []),
        details_synced_at: runStartedAt,
      });
      summary.detailsFetched++;
    } catch (error) {
      if (error instanceof TmdbError && error.status === 404) {
        summary.detailsSkipped++;
        log(`filme ${id} não existe mais no TMDB; pulando detalhes`);
        return;
      }
      throw error;
    }
  });

  // 4. Limpeza — só chega aqui se nada acima falhou
  summary.unlinked = await repo.deleteStaleMovieProviders(runStartedAt);

  // 5. Resumo
  log(
    `resumo: ${summary.added} adicionados, ${summary.updated} atualizados, ${summary.unlinked} desvinculados, ` +
      `${summary.detailsFetched} detalhes buscados, ${summary.detailsSkipped} pulados`,
  );
  return summary;
}
