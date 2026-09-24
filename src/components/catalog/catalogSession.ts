import type { MovieCardData } from '@/lib/queries/types';

// Estado do catálogo guardado na aba (sessionStorage) para o "voltar" de um filme
// reencontrar os blocos já carregados e a posição da rolagem.
// Qualquer falha de acesso (modo privado, cota, JSON inválido) é ignorada: o catálogo só
// deixa de restaurar e o "voltar" cai no comportamento simples.

export const CATALOG_QUERY_KEY = 'catalog-query';
const CATALOG_STATE_KEY = 'catalog-state';
const FROM_CATALOG_KEY = 'catalog-opened-film';

export interface CatalogState {
  query: string;
  movies: MovieCardData[];
  scrollY: number;
}

function read(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string | null): void {
  try {
    if (value === null) sessionStorage.removeItem(key);
    else sessionStorage.setItem(key, value);
  } catch {
    // Sem sessionStorage: nada a guardar.
  }
}

export function savedQuery(): string {
  return read(CATALOG_QUERY_KEY) ?? '';
}

export function saveQuery(query: string): void {
  write(CATALOG_QUERY_KEY, query);
}

export function loadCatalogState(): CatalogState | null {
  const raw = read(CATALOG_STATE_KEY);
  if (!raw) return null;
  try {
    const value = JSON.parse(raw) as Partial<CatalogState>;
    if (typeof value.query !== 'string' || !Array.isArray(value.movies) || typeof value.scrollY !== 'number') {
      return null;
    }
    return { query: value.query, movies: value.movies, scrollY: value.scrollY };
  } catch {
    return null;
  }
}

export function saveCatalogState(state: CatalogState): void {
  write(CATALOG_STATE_KEY, JSON.stringify(state));
}

/** Lista guardada que começa igual à primeira página renderizada no servidor (mesmos ids); pode ter blocos a mais. */
export function restorableMovies(
  stored: CatalogState | null,
  query: string,
  initialMovies: MovieCardData[],
): MovieCardData[] | null {
  if (!stored || stored.query !== query || stored.movies.length < initialMovies.length) return null;
  const extendsInitial = initialMovies.every((movie, i) => stored.movies[i]?.id === movie.id);
  return extendsInitial ? stored.movies : null;
}

/** Marca que o filme em `path` foi aberto por um clique num card do catálogo nesta aba. */
export function markFilmOpenedFromCatalog(path: string): void {
  write(FROM_CATALOG_KEY, path);
}

/** Usado pelo catálogo ao montar: diz se está voltando de um filme aberto por ele e apaga a marca. */
export function takeReturnFromFilm(): boolean {
  const marked = read(FROM_CATALOG_KEY) !== null;
  write(FROM_CATALOG_KEY, null);
  return marked;
}
