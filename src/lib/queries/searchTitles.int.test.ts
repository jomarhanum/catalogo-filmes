import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { searchTitles } from './searchTitles';

const db = anonDb();
const ids = async (q: string) => (await searchTitles(db, q, 0)).movies.map((m) => m.id);

describe('searchTitles', () => {
  it('encontra pelo título em português, sem diferenciar maiúsculas', async () => {
    expect(await ids('cidade de')).toEqual([3]);
    expect(await ids('CORRA')).toEqual([1]);
  });

  it('ignora acentos', async () => {
    expect(await ids('hereditario')).toEqual([2]);
  });

  it('encontra pelo título original', async () => {
    expect(await ids('get out')).toEqual([1]);
  });

  it('não traz filme fora de qualquer streaming', async () => {
    expect(await ids('sem streaming')).toEqual([]);
  });

  it('curingas do LIKE são texto literal', async () => {
    expect(await ids('%')).toEqual([]);
    expect(await ids('%%')).toEqual([]);
    expect(await ids('__')).toEqual([]);
    expect(await ids('\\')).toEqual([]);
  });

  it('pagina e informa o total, ordenado por popularidade', async () => {
    const first = await searchTitles(db, 'filme extra', 0);
    expect(first.total).toBe(30);
    expect(first.movies).toHaveLength(24);
    expect(first.movies[0].id).toBe(101);
    const second = await searchTitles(db, 'filme extra', 24);
    expect(second.movies).toHaveLength(6);
  });

  it('p_limit enorme é limitado', async () => {
    const { data, error } = await db.rpc('search_titles', { p_query: 'filme extra', p_limit: 1000 });
    expect(error).toBeNull();
    expect(data).toHaveLength(30);
  });

  it('termo curto não traz nada', async () => {
    expect(await ids('a')).toEqual([]);
  });
});
