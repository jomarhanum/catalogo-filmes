import type {
  CatalogRepository,
  GenreRow,
  MovieDetailsUpdate,
  MovieGenreRow,
  MovieProviderRow,
  MovieRow,
  ProviderRow,
} from '../repository';

function assertNoDuplicates(keys: string[]) {
  // O Postgres rejeita a mesma linha duas vezes num único upsert.
  if (new Set(keys).size !== keys.length) {
    throw new Error('ON CONFLICT DO UPDATE command cannot affect row a second time');
  }
}

export class MemoryRepository implements CatalogRepository {
  providers = new Map<number, ProviderRow>();
  genres = new Map<number, GenreRow>();
  movies = new Map<number, MovieRow & Partial<MovieDetailsUpdate>>();
  movieGenres = new Set<string>();
  links = new Map<string, MovieProviderRow & { last_seen_at: string }>();

  async upsertProviders(rows: ProviderRow[]) {
    for (const row of rows) this.providers.set(row.id, row);
  }

  async upsertGenres(rows: GenreRow[]) {
    for (const row of rows) this.genres.set(row.id, row);
  }

  async existingMovieIds(ids: number[]) {
    return new Set(ids.filter((id) => this.movies.has(id)));
  }

  async upsertMovies(rows: MovieRow[]) {
    assertNoDuplicates(rows.map((r) => String(r.id)));
    for (const row of rows) this.movies.set(row.id, { ...this.movies.get(row.id), ...row });
  }

  async upsertMovieGenres(rows: MovieGenreRow[]) {
    for (const row of rows) {
      if (!this.genres.has(row.genre_id)) throw new Error(`FK: gênero ${row.genre_id} não existe`);
      this.movieGenres.add(`${row.movie_id}:${row.genre_id}`);
    }
  }

  async touchMovieProviders(rows: MovieProviderRow[], seenAt: string) {
    const key = (r: MovieProviderRow) => `${r.movie_id}:${r.provider_id}:${r.access_type}`;
    assertNoDuplicates(rows.map(key));
    for (const row of rows) this.links.set(key(row), { ...row, last_seen_at: seenAt });
  }

  async listMoviesNeedingDetails(staleBefore: string) {
    return [...this.movies.values()]
      .filter((m) => !m.details_synced_at || m.details_synced_at < staleBefore)
      .map((m) => m.id)
      .sort((a, b) => a - b);
  }

  async updateMovieDetails(id: number, update: MovieDetailsUpdate) {
    const movie = this.movies.get(id);
    if (movie) this.movies.set(id, { ...movie, ...update });
  }

  async deleteStaleMovieProviders(before: string) {
    let removed = 0;
    for (const [key, link] of this.links) {
      if (link.last_seen_at < before) {
        this.links.delete(key);
        removed++;
      }
    }
    return removed;
  }
}
