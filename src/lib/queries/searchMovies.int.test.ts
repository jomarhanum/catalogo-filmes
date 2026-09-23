import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, type CatalogFilters } from '@/lib/filters';
import { anonDb } from '../../../tests/support/db';
import { searchMovies } from './searchMovies';

const db = anonDb();
const ids = async (patch: Partial<CatalogFilters>, offset = 0) =>
  (await searchMovies(db, { ...DEFAULT_FILTERS, ...patch }, offset)).movies.map((m) => m.id);

describe('searchMovies', () => {
  it('padrão: populares, 24 por bloco, total sem filmes fora de streaming', async () => {
    const result = await searchMovies(db, DEFAULT_FILTERS, 0);
    expect(result.total).toBe(38);
    expect(result.movies).toHaveLength(24);
    expect(result.movies.slice(0, 8).map((m) => m.id)).toEqual([7, 1, 2, 4, 3, 5, 8, 6]);
    expect(result.movies.map((m) => m.id)).not.toContain(9);
  });

  it('segundo bloco começa no deslocamento', async () => {
    const result = await searchMovies(db, DEFAULT_FILTERS, 24);
    expect(result.movies).toHaveLength(14);
    expect(result.movies[0].id).toBe(117);
    expect(result.total).toBe(38);
  });

  it('streaming', async () => expect(await ids({ providers: [8] })).toEqual([1, 3, 6]));
  it('streaming + tipo de acesso no mesmo vínculo', async () =>
    expect(await ids({ providers: [119], access: ['rent'] })).toEqual([1, 5]));
  it('tipo de acesso', async () => expect(await ids({ access: ['buy'] })).toEqual([7, 1, 3]));
  it('gêneros com OU', async () => expect(await ids({ genres: [27, 53] })).toEqual([1, 2, 4, 5]));
  it('faixa de ano exclui sem data', async () =>
    expect(await ids({ yearMin: 2018, yearMax: 2019 })).toEqual([2, 4, 5]));
  it('nota mínima', async () => expect(await ids({ minRating: 7.5 })).toEqual([7, 1, 3, 6]));
  it('duração máxima exclui sem duração', async () =>
    expect(await ids({ maxRuntime: 120 })).toEqual([7, 1, 4, 6]));
  it('idioma original', async () => expect(await ids({ language: 'pt' })).toEqual([3, 5]));

  it('ordem por nota ignora filmes com menos de 50 votos', async () => {
    const result = await searchMovies(db, { ...DEFAULT_FILTERS, sort: 'nota' }, 0);
    expect(result.total).toBe(37);
    expect(result.movies.slice(0, 7).map((m) => m.id)).toEqual([3, 7, 1, 2, 5, 4, 8]);
  });

  it('ordem por lançamento põe sem data no fim', async () => {
    const result = await searchMovies(db, { ...DEFAULT_FILTERS, sort: 'recentes' }, 24);
    expect((await ids({ sort: 'recentes' })).slice(0, 7)).toEqual([6, 5, 4, 2, 1, 7, 3]);
    expect(result.movies.at(-1)?.id).toBe(8);
  });

  it('ordem A–Z', async () =>
    expect(await ids({ language: 'en', sort: 'az' })).toEqual([1, 6, 2, 7, 4, 8]));

  it('card traz cada streaming uma vez, na ordem de prioridade', async () => {
    const [movie] = (await searchMovies(db, { ...DEFAULT_FILTERS, providers: [8], sort: 'az' }, 0)).movies;
    expect(movie.id).toBe(3);
    expect(movie.providers).toEqual([
      { id: 8, name: 'Netflix', logoPath: null },
      { id: 119, name: 'Amazon Prime Video', logoPath: null },
    ]);
    const corra = (await searchMovies(db, { ...DEFAULT_FILTERS, providers: [8] }, 0)).movies[0];
    expect(corra.providers.map((p) => p.id)).toEqual([8, 119]);
  });

  it('sem resultados', async () => {
    expect(await searchMovies(db, { ...DEFAULT_FILTERS, language: 'zz' }, 0)).toEqual({ movies: [], total: 0 });
  });
});
