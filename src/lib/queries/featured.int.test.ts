import { afterAll, describe, expect, it } from 'vitest';
import { anonDb, serviceDb } from '../../../tests/support/db';
import { getFeaturedMovie } from './featured';

const service = serviceDb();
const LINKED = 900100;
const UNLINKED = 900101;

async function cleanup() {
  await service.from('movies').delete().in('id', [LINKED, UNLINKED]);
}

afterAll(cleanup);

describe('getFeaturedMovie', () => {
  it('sem filme com imagem de fundo, não há destaque', async () => {
    await cleanup();
    expect(await getFeaturedMovie(anonDb())).toBeNull();
  });

  it('escolhe o mais popular com imagem de fundo e sinopse que está em algum streaming', async () => {
    const base = { original_language: 'en', vote_average: 7, vote_count: 100, overview: 'Sinopse.', backdrop_path: '/b.jpg' };
    const { error } = await service.from('movies').insert([
      { ...base, id: LINKED, title: 'Destaque Teste', original_title: 'Featured Test', popularity: 1000 },
      { ...base, id: UNLINKED, title: 'Sem Streaming Teste', original_title: 'Unlinked Test', popularity: 2000 },
    ]);
    expect(error).toBeNull();
    await service.from('movie_providers').insert({ movie_id: LINKED, provider_id: 8, access_type: 'flatrate' });

    const featured = await getFeaturedMovie(anonDb());
    expect(featured?.id).toBe(LINKED);
    expect(featured?.watch.flatrate.map((p) => p.id)).toEqual([8]);
  });
});
