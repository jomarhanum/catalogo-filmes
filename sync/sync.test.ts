import { beforeEach, describe, expect, it } from 'vitest';
import { runSync } from './sync';
import { FakeTmdb, tmdbMovie } from './testing/fake-tmdb';
import { MemoryRepository } from './testing/memory-repository';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-09-23T06:00:00.000Z');
const at = (days: number) => () => new Date(T0.getTime() + days * DAY);

let tmdb: FakeTmdb;
let repo: MemoryRepository;

beforeEach(() => {
  tmdb = new FakeTmdb();
  repo = new MemoryRepository();
  tmdb.providers = [
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 5, display_priorities: { BR: 1 } },
    { provider_id: 119, provider_name: 'Prime Video', logo_path: '/p.jpg', display_priority: 7 },
  ];
  tmdb.genres = [{ id: 27, name: 'Terror' }];
  for (const id of [1, 2]) tmdb.details.set(id, { id, runtime: 100 + id, backdrop_path: `/b${id}.jpg` });
});

describe('runSync', () => {
  it('primeira execução grava tudo e busca detalhes', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1, { genre_ids: [27, 999], release_date: '' })]);
    tmdb.details.set(1, {
      id: 1,
      runtime: 104,
      backdrop_path: '/b.jpg',
      videos: {
        results: [
          { key: 'abc', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt', published_at: '2020-01-01' },
        ],
      },
    });

    const summary = await runSync({ tmdb, repo, now: at(0) });

    expect(summary).toEqual({ added: 1, updated: 0, unlinked: 0, detailsFetched: 1, detailsSkipped: 0 });
    expect(repo.providers.get(8)).toEqual({ id: 8, name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 });
    expect(repo.providers.get(119)?.display_priority).toBe(7);
    expect(repo.movies.get(1)).toMatchObject({
      release_date: null,
      overview: null,
      runtime: 104,
      trailer_key: 'abc',
      details_synced_at: T0.toISOString(),
    });
    expect([...repo.movieGenres]).toEqual(['1:27']);
    expect([...repo.links.keys()]).toEqual(['1:8:flatrate']);
  });

  it('remove ligações de filmes que saíram do streaming', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(2)]);
    await runSync({ tmdb, repo, now: at(0) });

    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    const summary = await runSync({ tmdb, repo, now: at(1) });

    expect(summary).toMatchObject({ added: 0, updated: 1, unlinked: 1 });
    expect([...repo.links.keys()]).toEqual(['1:8:flatrate']);
    expect(repo.movies.has(2)).toBe(true);
  });

  function trackDiscoverConcurrency(client: FakeTmdb, delayMs = 5) {
    let inFlight = 0;
    let peak = 0;
    const original = client.discover.bind(client);
    client.discover = async (params) => {
      inFlight++;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      try {
        return await original(params);
      } finally {
        inFlight--;
      }
    };
    return () => peak;
  }

  it('varre vários streamings em paralelo (concorrência padrão)', async () => {
    const peak = trackDiscoverConcurrency(tmdb);

    await runSync({ tmdb, repo, now: at(0) });

    expect(peak()).toBeGreaterThan(1);
    expect(peak()).toBeLessThanOrEqual(8);
  });

  it('respeita o limite de scanConcurrency informado', async () => {
    const peak = trackDiscoverConcurrency(tmdb);

    await runSync({ tmdb, repo, now: at(0), scanConcurrency: 8 });

    expect(peak()).toBeGreaterThan(1);
    expect(peak()).toBeLessThanOrEqual(8);
  });

  it('grava filmes em ordem de id, mesmo que a página do TMDB não esteja ordenada', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(30), tmdbMovie(10), tmdbMovie(20)]);
    const receivedIds: number[][] = [];
    const originalUpsertMovies = repo.upsertMovies.bind(repo);
    repo.upsertMovies = async (rows) => {
      receivedIds.push(rows.map((r) => r.id));
      return originalUpsertMovies(rows);
    };

    await runSync({ tmdb, repo, now: at(0) });

    expect(receivedIds).toEqual([[10, 20, 30]]);
  });

  it('falha no meio não apaga nenhuma ligação', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(2)]);
    await runSync({ tmdb, repo, now: at(0) });

    tmdb.failDiscoverAfter = 0;
    await expect(runSync({ tmdb, repo, now: at(1) })).rejects.toMatchObject({ status: 500 });
    expect(repo.links.size).toBe(2);
  });

  it('filme removido do TMDB (404 nos detalhes) é pulado e a limpeza ainda roda', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(3)]);
    const summary = await runSync({ tmdb, repo, now: at(0) });
    expect(summary).toMatchObject({ detailsFetched: 1, detailsSkipped: 1 });

    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    tmdb.details.set(3, { id: 3, runtime: 90, backdrop_path: null });
    const second = await runSync({ tmdb, repo, now: at(1) });
    expect(second.unlinked).toBe(1);
  });

  it('só renova detalhes com mais de 30 dias', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    await runSync({ tmdb, repo, now: at(0) });
    tmdb.detailCalls = [];

    await runSync({ tmdb, repo, now: at(10) });
    expect(tmdb.detailCalls).toEqual([]);

    await runSync({ tmdb, repo, now: at(31) });
    expect(tmdb.detailCalls).toEqual([1]);
  });

  it('filme repetido na página ou em vários streamings conta e grava uma vez', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(1)]);
    tmdb.catalog.set('119:rent', [tmdbMovie(1)]);
    const summary = await runSync({ tmdb, repo, now: at(0) });
    expect(summary.added).toBe(1);
    expect([...repo.links.keys()].sort()).toEqual(['1:119:rent', '1:8:flatrate']);
  });

  it('filme sem nenhum streaming não tem os detalhes renovados', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(2)]);
    await runSync({ tmdb, repo, now: at(0) });
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    await runSync({ tmdb, repo, now: at(1) });
    expect([...repo.links.keys()]).toEqual(['1:8:flatrate']);
    tmdb.detailCalls = [];

    await runSync({ tmdb, repo, now: at(31) });
    expect(tmdb.detailCalls).toEqual([1]);
  });

  it('aborta a limpeza se a maioria das ligações sumir de uma vez', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => i + 1);
    tmdb.catalog.set('8:flatrate', ids.map((id) => tmdbMovie(id)));
    await runSync({ tmdb, repo, now: at(0) });
    expect(repo.links.size).toBe(150);

    tmdb.catalog.set('8:flatrate', ids.slice(0, 10).map((id) => tmdbMovie(id)));
    await expect(runSync({ tmdb, repo, now: at(1) })).rejects.toThrow(/140 de 150/);
    expect(repo.links.size).toBe(150);
  });

  it('remoções pequenas num catálogo grande seguem normais', async () => {
    const ids = Array.from({ length: 150 }, (_, i) => i + 1);
    tmdb.catalog.set('8:flatrate', ids.map((id) => tmdbMovie(id)));
    await runSync({ tmdb, repo, now: at(0) });

    tmdb.catalog.set('8:flatrate', ids.slice(0, 130).map((id) => tmdbMovie(id)));
    const summary = await runSync({ tmdb, repo, now: at(1) });
    expect(summary.unlinked).toBe(20);
    expect(repo.links.size).toBe(130);
  });
});
