import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serviceDb } from '../tests/support/db';
import { createSupabaseRepository } from './supabase-repository';

const db = serviceDb();
const repo = createSupabaseRepository(db);
const MOVIE = 900001;
const PROVIDER = 900001;
const GENRE = 900001;

async function cleanup() {
  await db.from('movies').delete().eq('id', MOVIE);
  await db.from('providers').delete().eq('id', PROVIDER);
  await db.from('genres').delete().eq('id', GENRE);
}

beforeAll(cleanup);
afterAll(cleanup);

const movieRow = {
  id: MOVIE,
  title: 'Filme de Teste',
  original_title: 'Test Movie',
  overview: null,
  release_date: '2020-05-01',
  vote_average: 7.25,
  vote_count: 10,
  popularity: 1,
  original_language: 'en',
  poster_path: null,
  backdrop_path: null,
};

describe('createSupabaseRepository', () => {
  it('grava, atualiza detalhes sem perder dados e remove ligações antigas', async () => {
    await repo.upsertProviders([{ id: PROVIDER, name: 'Teste', logo_path: null, display_priority: 1 }]);
    await repo.upsertGenres([{ id: GENRE, name: 'Gênero Teste' }]);
    await repo.upsertMovies([movieRow]);
    expect(await repo.existingMovieIds([MOVIE, MOVIE + 1])).toEqual(new Set([MOVIE]));

    await repo.upsertMovieGenres([{ movie_id: MOVIE, genre_id: GENRE }]);
    await repo.upsertMovieGenres([{ movie_id: MOVIE, genre_id: GENRE }]);

    await repo.touchMovieProviders(
      [{ movie_id: MOVIE, provider_id: PROVIDER, access_type: 'flatrate' }],
      '2026-01-01T00:00:00.000Z',
    );

    expect(await repo.listMoviesNeedingDetails('2026-01-01T00:00:00.000Z')).toContain(MOVIE);
    await repo.updateMovieDetails(MOVIE, {
      runtime: 100,
      backdrop_path: '/b.jpg',
      trailer_key: 'k',
      details_synced_at: '2026-01-02T00:00:00.000Z',
    });
    expect(await repo.listMoviesNeedingDetails('2026-01-01T00:00:00.000Z')).not.toContain(MOVIE);

    await repo.upsertMovies([{ ...movieRow, title: 'Novo Título', backdrop_path: '/b.jpg' }]);
    const { data } = await db.from('movies').select('title, runtime, trailer_key, vote_average').eq('id', MOVIE).single();
    expect(data).toEqual({ title: 'Novo Título', runtime: 100, trailer_key: 'k', vote_average: 7.3 });

    expect(await repo.deleteStaleMovieProviders('2026-01-01T00:00:00.000Z')).toBe(0);
    expect(await repo.deleteStaleMovieProviders('2026-01-01T00:00:01.000Z')).toBe(1);
  });
});
