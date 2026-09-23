import { describe, expect, it } from 'vitest';
import { anonDb, serviceDb } from '../../../tests/support/db';

describe('RLS', () => {
  it('a chave pública lê filmes', async () => {
    const { data, error } = await anonDb().from('movies').select('id').eq('id', 1);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }]);
  });

  it('a chave pública não grava', async () => {
    const { error } = await anonDb().from('genres').insert({ id: 990000, name: 'Invasor' });
    expect(error).not.toBeNull();
  });

  it('a chave pública não apaga', async () => {
    await anonDb().from('movie_providers').delete().eq('movie_id', 1);
    const { count } = await serviceDb()
      .from('movie_providers')
      .select('*', { count: 'exact', head: true })
      .eq('movie_id', 1);
    expect(count).toBe(3);
  });
});
