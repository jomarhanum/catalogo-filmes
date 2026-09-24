import { z } from 'zod';

export const ACCESS_TYPES = ['flatrate', 'rent', 'buy'] as const;
export type AccessType = (typeof ACCESS_TYPES)[number];
export const ACCESS_LABELS: Record<AccessType, string> = {
  flatrate: 'Assinatura',
  rent: 'Aluguel',
  buy: 'Compra',
};

export const SORT_KEYS = ['populares', 'nota', 'recentes', 'az'] as const;
export type SortKey = (typeof SORT_KEYS)[number];
export const SORT_LABELS: Record<SortKey, string> = {
  populares: 'Populares agora',
  nota: 'Mais bem avaliados',
  recentes: 'Lançamentos recentes',
  az: 'A–Z',
};

export interface CatalogFilters {
  providers: number[];
  access: AccessType[];
  genres: number[];
  yearMin: number | null;
  yearMax: number | null;
  minRating: number | null;
  maxRuntime: number | null;
  language: string | null;
  sort: SortKey;
}

export const DEFAULT_FILTERS: CatalogFilters = {
  providers: [],
  access: [],
  genres: [],
  yearMin: null,
  yearMax: null,
  minRating: null,
  maxRuntime: null,
  language: null,
  sort: 'populares',
};

export type RawSearchParams = Record<string, string | string[] | undefined>;

const idSchema = z.coerce.number().int().positive().max(2_147_483_647);
const yearSchema = z.coerce.number().int().min(1870).max(2100);
const ratingSchema = z.coerce.number().min(0).max(10);
const runtimeSchema = z.coerce.number().int().min(1).max(600);
const languageSchema = z.string().regex(/^[a-z]{2}$/);
const accessSchema = z.enum(ACCESS_TYPES);
const sortSchema = z.enum(SORT_KEYS);

function rawValues(raw: RawSearchParams, key: string): string[] {
  const value = raw[key];
  if (value === undefined) return [];
  return (Array.isArray(value) ? value : [value])
    .flatMap((part) => part.split(','))
    .map((part) => part.trim())
    .filter(Boolean);
}

function parseList<T>(raw: RawSearchParams, key: string, schema: z.ZodType<T>): T[] {
  const parsed = rawValues(raw, key).flatMap((value) => {
    const result = schema.safeParse(value);
    return result.success ? [result.data] : [];
  });
  return [...new Set(parsed)];
}

function parseOne<T>(raw: RawSearchParams, key: string, schema: z.ZodType<T>): T | null {
  const [first] = rawValues(raw, key);
  if (first === undefined) return null;
  const result = schema.safeParse(first);
  return result.success ? result.data : null;
}

export function parseFilters(raw: RawSearchParams): CatalogFilters {
  let yearMin = parseOne(raw, 'ano_min', yearSchema);
  let yearMax = parseOne(raw, 'ano_max', yearSchema);
  if (yearMin !== null && yearMax !== null && yearMin > yearMax) [yearMin, yearMax] = [yearMax, yearMin];

  return {
    providers: parseList(raw, 'streaming', idSchema),
    access: parseList(raw, 'acesso', accessSchema),
    genres: parseList(raw, 'genero', idSchema),
    yearMin,
    yearMax,
    minRating: parseOne(raw, 'nota', ratingSchema),
    maxRuntime: parseOne(raw, 'duracao_max', runtimeSchema),
    language: parseOne(raw, 'idioma', languageSchema),
    sort: parseOne(raw, 'ordem', sortSchema) ?? 'populares',
  };
}

export function filtersToQuery(f: CatalogFilters): string {
  const parts: string[] = [];
  const add = (key: string, value: string | number | null) => {
    if (value !== null && value !== '') parts.push(`${key}=${value}`);
  };
  add('streaming', f.providers.join(','));
  add('acesso', f.access.join(','));
  add('genero', f.genres.join(','));
  add('ano_min', f.yearMin);
  add('ano_max', f.yearMax);
  add('nota', f.minRating);
  add('duracao_max', f.maxRuntime);
  add('idioma', f.language);
  if (f.sort !== 'populares') add('ordem', f.sort);
  return parts.join('&');
}

export function countExtraFilters(f: CatalogFilters): number {
  return [
    f.genres.length > 0,
    f.yearMin !== null || f.yearMax !== null,
    f.minRating !== null,
    f.maxRuntime !== null,
    f.language !== null,
  ].filter(Boolean).length;
}

export function toggle<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((item) => item !== value) : [...list, value];
}

export function parseOffset(value: unknown): number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000 ? value : 0;
}

export function parseMovieId(value: string): number | null {
  return /^\d{1,9}$/.test(value) ? Number(value) : null;
}

export const CATALOG_PARAM_KEYS = [
  'streaming',
  'acesso',
  'genero',
  'ano_min',
  'ano_max',
  'nota',
  'duracao_max',
  'idioma',
  'ordem',
] as const;

/** Links antigos do catálogo apontavam para `/?...`; devolve o novo endereço ou null se não há filtros. */
export function catalogRedirectTarget(raw: RawSearchParams): string | null {
  if (!CATALOG_PARAM_KEYS.some((key) => raw[key] !== undefined)) return null;
  const query = filtersToQuery(parseFilters(raw));
  return query ? `/catalogo?${query}` : '/catalogo';
}

/** Termo de busca: sem espaços nas pontas, até 100 caracteres, mínimo 2. */
export function parseSearchQuery(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') return null;
  // Conta pontos de código (não unidades UTF-16) para não partir um emoji ao meio.
  const term = Array.from(first.trim()).slice(0, 100).join('').trim();
  return Array.from(term).length >= 2 ? term : null;
}
