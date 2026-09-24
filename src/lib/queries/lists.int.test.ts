import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { listGenres, listProviders } from './lists';

describe('listProviders', () => {
  it('só streamings com filmes, por prioridade', async () => {
    expect((await listProviders(anonDb())).map((p) => p.id)).toEqual([8, 119, 337, 1899]);
  });
});

describe('listGenres', () => {
  it('ordem alfabética em português', async () => {
    expect((await listGenres(anonDb())).map((g) => g.name)).toEqual([
      'Ação',
      'Documentário',
      'Drama',
      'Terror',
      'Thriller',
    ]);
  });
});
