import { describe, expect, it } from 'vitest';
import type { MovieCardData } from '@/lib/queries/types';
import { restorableMovies } from './catalogSession';

const movie = (id: number): MovieCardData => ({
  id,
  title: `Filme ${id}`,
  releaseDate: null,
  runtime: null,
  voteAverage: 7,
  posterPath: null,
  providers: [],
});

const initial = [movie(1), movie(2)];
const stored = (query: string, ids: number[]) => ({ query, movies: ids.map(movie), scrollY: 500 });

describe('restorableMovies', () => {
  it('restaura a lista guardada que continua a primeira página', () => {
    expect(restorableMovies(stored('streaming=8', [1, 2, 3]), 'streaming=8', initial)?.map((m) => m.id)).toEqual([
      1, 2, 3,
    ]);
  });

  it('ignora lista de outra busca', () => {
    expect(restorableMovies(stored('streaming=119', [1, 2, 3]), 'streaming=8', initial)).toBeNull();
  });

  it('ignora lista que não começa pelos mesmos filmes', () => {
    expect(restorableMovies(stored('', [2, 1, 3]), '', initial)).toBeNull();
    expect(restorableMovies(stored('', [1]), '', initial)).toBeNull();
  });

  it('ignora ausência de estado', () => {
    expect(restorableMovies(null, '', initial)).toBeNull();
  });
});
