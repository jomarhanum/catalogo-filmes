import {
  TmdbError,
  type DiscoverPage,
  type DiscoverParams,
  type TmdbClient,
  type TmdbDetails,
  type TmdbGenre,
  type TmdbMovie,
  type TmdbProvider,
} from '../tmdb';

export class FakeTmdb implements TmdbClient {
  providers: TmdbProvider[] = [];
  genres: TmdbGenre[] = [];
  /** Chave: `${providerId}:${accessType}` */
  catalog = new Map<string, TmdbMovie[]>();
  details = new Map<number, TmdbDetails>();
  /** Se definido, o discover falha com 500 depois de N chamadas. */
  failDiscoverAfter: number | null = null;
  discoverCalls: DiscoverParams[] = [];
  detailCalls: number[] = [];
  pageSize = 20;

  async getProviders() {
    return this.providers;
  }

  async getGenres() {
    return this.genres;
  }

  async discover(p: DiscoverParams): Promise<DiscoverPage> {
    this.discoverCalls.push(p);
    if (this.failDiscoverAfter !== null && this.discoverCalls.length > this.failDiscoverAfter) {
      throw new TmdbError(500, '/discover/movie');
    }
    const all = this.catalog.get(`${p.providerId}:${p.accessType}`) ?? [];
    const start = (p.page - 1) * this.pageSize;
    return {
      page: p.page,
      total_pages: Math.max(1, Math.ceil(all.length / this.pageSize)),
      total_results: all.length,
      results: all.slice(start, start + this.pageSize),
    };
  }

  async getDetails(id: number): Promise<TmdbDetails> {
    this.detailCalls.push(id);
    const found = this.details.get(id);
    if (!found) throw new TmdbError(404, `/movie/${id}`);
    return found;
  }
}

export function tmdbMovie(id: number, patch: Partial<TmdbMovie> = {}): TmdbMovie {
  return {
    id,
    title: `Filme ${id}`,
    original_title: `Movie ${id}`,
    overview: '',
    release_date: '2020-01-01',
    vote_average: 7,
    vote_count: 100,
    popularity: 10,
    original_language: 'en',
    poster_path: null,
    backdrop_path: null,
    genre_ids: [],
    ...patch,
  };
}
