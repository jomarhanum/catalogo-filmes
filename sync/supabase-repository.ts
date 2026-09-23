import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import type { CatalogRepository } from './repository';

const PAGE = 1000;

function check(error: PostgrestError | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function createSupabaseRepository(db: SupabaseClient<Database>): CatalogRepository {
  return {
    async upsertProviders(rows) {
      const { error } = await db.from('providers').upsert(rows);
      check(error, 'upsert providers');
    },

    async upsertGenres(rows) {
      const { error } = await db.from('genres').upsert(rows);
      check(error, 'upsert genres');
    },

    async existingMovieIds(ids) {
      const { data, error } = await db.from('movies').select('id').in('id', ids);
      check(error, 'existingMovieIds');
      return new Set((data ?? []).map((row) => row.id));
    },

    async upsertMovies(rows) {
      // O upsert só atualiza as colunas enviadas: runtime, trailer_key etc. não são apagados.
      const { error } = await db.from('movies').upsert(rows);
      check(error, 'upsert movies');
    },

    async upsertMovieGenres(rows) {
      if (rows.length === 0) return;
      const { error } = await db
        .from('movie_genres')
        .upsert(rows, { onConflict: 'movie_id,genre_id', ignoreDuplicates: true });
      check(error, 'upsert movie_genres');
    },

    async touchMovieProviders(rows, seenAt) {
      const { error } = await db
        .from('movie_providers')
        .upsert(
          rows.map((row) => ({ ...row, last_seen_at: seenAt })),
          { onConflict: 'movie_id,provider_id,access_type' },
        );
      check(error, 'upsert movie_providers');
    },

    async listMoviesNeedingDetails(staleBefore) {
      const ids: number[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db
          .from('movies')
          .select('id')
          .or(`details_synced_at.is.null,details_synced_at.lt."${staleBefore}"`)
          .order('id')
          .range(from, from + PAGE - 1);
        check(error, 'listMoviesNeedingDetails');
        ids.push(...(data ?? []).map((row) => row.id));
        if (!data || data.length < PAGE) return ids;
      }
    },

    async updateMovieDetails(id, update) {
      const { error } = await db.from('movies').update(update).eq('id', id);
      check(error, `updateMovieDetails(${id})`);
    },

    async deleteStaleMovieProviders(before) {
      const { count, error } = await db
        .from('movie_providers')
        .delete({ count: 'exact' })
        .lt('last_seen_at', before);
      check(error, 'deleteStaleMovieProviders');
      return count ?? 0;
    },
  };
}
