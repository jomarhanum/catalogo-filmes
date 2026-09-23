import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';

// Guarda a migração supabase/migrations/20260923000300_search_limits.sql:
// search_movies limita p_limit a 100 (e a no mínimo 0) e p_offset a no mínimo 0,
// e a página sai com `order by` explícito no select final.

const db = anonDb();
const rpcIds = async (args: { p_limit?: number; p_offset?: number; p_sort?: string }) => {
  const { data, error } = await db.rpc('search_movies', args);
  if (error) throw error;
  return data.map((row) => row.id);
};

describe('search_movies: limites de página', () => {
  it('p_limit comum devolve exatamente esse número de linhas', async () => {
    expect(await rpcIds({ p_limit: 5 })).toHaveLength(5);
  });

  it('p_limit enorme não quebra: a seed tem 38 visíveis (< teto de 100)', async () => {
    expect(await rpcIds({ p_limit: 1000 })).toHaveLength(38);
  });

  it('p_limit e p_offset negativos são tratados como 0', async () => {
    expect(await rpcIds({ p_limit: -5 })).toHaveLength(0);
    expect(await rpcIds({ p_limit: 5, p_offset: -10 })).toEqual(await rpcIds({ p_limit: 5, p_offset: 0 }));
  });

  it('ordem das linhas é a mesma da paginação', async () => {
    const all = await rpcIds({ p_limit: 100, p_sort: 'az' });
    const pages = [...(await rpcIds({ p_limit: 10, p_sort: 'az' })), ...(await rpcIds({ p_limit: 10, p_offset: 10, p_sort: 'az' }))];
    expect(pages).toEqual(all.slice(0, 20));
  });
});

// A seed só tem 38 filmes visíveis, então o teto de 100 é verificado em SQL: dentro de uma
// transação desfeita no fim, cria 150 filmes vinculados a um streaming e conta quantas linhas
// search_movies(p_limit => 1000) devolve. Usa psql no contêiner local (como o teste de
// plan_cache_mode); sem Docker, a verificação é pulada.
function findSupabaseDbContainer(): string | null {
  try {
    const names = execFileSync('docker', ['ps', '--filter', 'name=supabase_db', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    return names[0] ?? null;
  } catch {
    return null;
  }
}

const container = findSupabaseDbContainer();

const CAP_SQL = `
begin;
insert into public.movies (id, title, original_title, original_language, popularity)
select 900000 + g, 'Teste ' || g, 'Teste ' || g, 'en', 0 from generate_series(1, 150) g;
insert into public.movie_providers (movie_id, provider_id, access_type)
select 900000 + g, (select min(id) from public.providers), 'flatrate' from generate_series(1, 150) g;
select count(*) from public.search_movies(p_limit => 1000);
rollback;
`;

describe.skipIf(!container)('search_movies: teto de p_limit em SQL', () => {
  it('com 188 filmes visíveis, p_limit 1000 devolve 100', () => {
    const output = execFileSync(
      'docker',
      ['exec', '-i', container as string, 'psql', '-U', 'postgres', '-d', 'postgres', '-tA', '-v', 'ON_ERROR_STOP=1'],
      { encoding: 'utf8', input: CAP_SQL },
    );
    const counts = output
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => /^\d+$/.test(line));
    expect(counts).toEqual(['100']);
  });
});
