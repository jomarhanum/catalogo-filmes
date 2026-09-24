import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { getHomeRows } from './homeRows';

describe('getHomeRows', () => {
  it('só as fileiras com filmes, na ordem, com até 20 filmes', async () => {
    const rows = await getHomeRows(anonDb());
    expect(rows.map((r) => r.row.title)).toEqual([
      'Em alta agora',
      'Na Netflix',
      'No Disney+',
      'Na HBO Max',
      'Ação',
      'Terror',
      'Drama',
      'Mais bem avaliados',
    ]);
    for (const { movies } of rows) expect(movies.length).toBeLessThanOrEqual(20);
    expect(rows[0].movies[0].id).toBe(7);
    expect(rows[1].movies.map((m) => m.id)).toEqual([1, 3, 6]);
    expect(rows.find((r) => r.row.id === 'terror')?.movies.map((m) => m.id)).toEqual([1, 2, 4]);
  });
});
