import { describe, expect, it, vi } from 'vitest';
import { TmdbError, createTmdbClient } from './tmdb';

function fakeFetch(responses: { status: number; body?: unknown }[]) {
  const urls: string[] = [];
  const headers: HeadersInit[] = [];
  const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    urls.push(String(url));
    headers.push(init?.headers ?? {});
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status });
  });
  return { fn: fn as unknown as typeof fetch, urls, headers, calls: () => fn.mock.calls.length };
}

function client(fetchFn: typeof fetch, sleeps: number[] = []) {
  return createTmdbClient({
    token: 'tok',
    fetchFn,
    requestsPerSecond: Infinity,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
}

describe('createTmdbClient', () => {
  it('envia o token e os parâmetros do discover', async () => {
    const f = fakeFetch([{ status: 200, body: { page: 2, total_pages: 3, total_results: 50, results: [] } }]);
    const page = await client(f.fn).discover({
      providerId: 8,
      accessType: 'flatrate',
      page: 2,
      range: { gte: '2000-01-01', lte: '2000-12-31' },
    });
    expect(page.total_pages).toBe(3);
    const url = new URL(f.urls[0]);
    expect(url.pathname).toBe('/3/discover/movie');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      watch_region: 'BR',
      with_watch_providers: '8',
      with_watch_monetization_types: 'flatrate',
      language: 'pt-BR',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      page: '2',
      'primary_release_date.gte': '2000-01-01',
      'primary_release_date.lte': '2000-12-31',
    });
    expect(f.headers[0]).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('pede detalhes com vídeos em pt e en', async () => {
    const f = fakeFetch([{ status: 200, body: { id: 1, runtime: 100, backdrop_path: null } }]);
    await client(f.fn).getDetails(1);
    const url = new URL(f.urls[0]);
    expect(url.pathname).toBe('/3/movie/1');
    expect(url.searchParams.get('append_to_response')).toBe('videos');
    expect(url.searchParams.get('include_video_language')).toBe('pt,en,null');
  });

  it('tenta de novo em 429 com espera crescente', async () => {
    const sleeps: number[] = [];
    const f = fakeFetch([{ status: 429 }, { status: 503 }, { status: 200, body: { genres: [{ id: 1, name: 'x' }] } }]);
    expect(await client(f.fn, sleeps).getGenres()).toEqual([{ id: 1, name: 'x' }]);
    expect(sleeps).toEqual([1000, 2000]);
  });

  it('desiste depois de 3 novas tentativas', async () => {
    const f = fakeFetch([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 500 }]);
    await expect(client(f.fn).getGenres()).rejects.toMatchObject({ status: 500 });
    expect(f.calls()).toBe(4);
  });

  it('404 falha na hora com TmdbError', async () => {
    const f = fakeFetch([{ status: 404 }]);
    const error = await client(f.fn).getDetails(99).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TmdbError);
    expect(error).toMatchObject({ status: 404, path: '/movie/99' });
    expect(f.calls()).toBe(1);
  });

  it('respeita o limite de requisições por segundo', async () => {
    const sleeps: number[] = [];
    const f = fakeFetch([]);
    const c = createTmdbClient({ token: 't', fetchFn: f.fn, requestsPerSecond: 10, sleep: async (ms) => void sleeps.push(ms) });
    await Promise.all([c.getGenres(), c.getGenres(), c.getGenres()]);
    expect(sleeps.length).toBe(2);
    expect(sleeps.every((ms) => ms > 0 && ms <= 200)).toBe(true);
  });
});
