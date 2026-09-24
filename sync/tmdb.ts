import type { AccessType } from '../src/lib/filters';

export class TmdbError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`TMDB respondeu ${status} em ${path}`);
    this.name = 'TmdbError';
  }
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
  display_priorities?: Record<string, number>;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string | null;
  published_at: string;
}

export interface TmdbDetails {
  id: number;
  runtime: number | null;
  backdrop_path: string | null;
  videos?: { results: TmdbVideo[] };
}

export interface DateRange {
  gte: string;
  lte: string;
}

export interface DiscoverParams {
  providerId: number;
  accessType: AccessType;
  page: number;
  range?: DateRange;
}

export interface DiscoverPage {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovie[];
}

export interface TmdbClient {
  getProviders(): Promise<TmdbProvider[]>;
  getGenres(): Promise<TmdbGenre[]>;
  discover(params: DiscoverParams): Promise<DiscoverPage>;
  getDetails(id: number): Promise<TmdbDetails>;
}

export interface TmdbClientOptions {
  token: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  requestsPerSecond?: number;
  retryDelaysMs?: number[];
  baseUrl?: string;
}

type Params = Record<string, string | number | undefined>;

export function createTmdbClient(opts: TmdbClientOptions): TmdbClient {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const interval = 1000 / (opts.requestsPerSecond ?? 20);
  const retryDelays = opts.retryDelaysMs ?? [1000, 2000, 4000];
  const baseUrl = opts.baseUrl ?? 'https://api.themoviedb.org/3';
  let nextSlot = 0;

  async function throttle() {
    const now = Date.now();
    const start = Math.max(now, nextSlot);
    nextSlot = start + interval;
    if (start > now) await sleep(start - now);
  }

  async function get<T>(path: string, params: Params): Promise<T> {
    const url = new URL(baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; ; attempt++) {
      await throttle();
      let response: Response | undefined;
      let networkError: unknown;
      try {
        response = await fetchFn(url, {
          headers: { Authorization: `Bearer ${opts.token}`, accept: 'application/json' },
        });
      } catch (error) {
        networkError = error;
      }

      if (response?.ok) return (await response.json()) as T;

      const retryable = !response || response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= retryDelays.length) {
        if (response) throw new TmdbError(response.status, path);
        throw networkError;
      }
      await sleep(retryDelays[attempt]);
    }
  }

  return {
    async getProviders() {
      const body = await get<{ results: TmdbProvider[] }>('/watch/providers/movie', {
        language: 'pt-BR',
        watch_region: 'BR',
      });
      return body.results;
    },
    async getGenres() {
      const body = await get<{ genres: TmdbGenre[] }>('/genre/movie/list', { language: 'pt-BR' });
      return body.genres;
    },
    discover({ providerId, accessType, page, range }) {
      return get<DiscoverPage>('/discover/movie', {
        watch_region: 'BR',
        with_watch_providers: providerId,
        with_watch_monetization_types: accessType,
        language: 'pt-BR',
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page,
        'primary_release_date.gte': range?.gte,
        'primary_release_date.lte': range?.lte,
      });
    },
    getDetails(id) {
      return get<TmdbDetails>(`/movie/${id}`, {
        language: 'pt-BR',
        append_to_response: 'videos',
        include_video_language: 'pt,en,null',
      });
    },
  };
}
