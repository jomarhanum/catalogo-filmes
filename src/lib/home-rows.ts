import { DEFAULT_FILTERS, filtersToQuery, type CatalogFilters } from './filters';

export interface HomeRow {
  id: string;
  title: string;
  filters: CatalogFilters;
}

export const HOME_ROW_SIZE = 20;

const filters = (patch: Partial<CatalogFilters>): CatalogFilters => ({ ...DEFAULT_FILTERS, ...patch });
const subscription = (providerId: number) => filters({ providers: [providerId], access: ['flatrate'] });

// Ids do TMDB (streamings e gêneros). Para mudar as fileiras da vitrine, edite só esta lista.
export const HOME_ROWS: HomeRow[] = [
  { id: 'em-alta', title: 'Em alta agora', filters: filters({}) },
  { id: 'netflix', title: 'Na Netflix', filters: subscription(8) },
  { id: 'prime-video', title: 'No Prime Video', filters: subscription(119) },
  { id: 'disney-plus', title: 'No Disney+', filters: subscription(337) },
  { id: 'max', title: 'Na Max', filters: subscription(1899) },
  { id: 'acao', title: 'Ação', filters: filters({ genres: [28] }) },
  { id: 'comedia', title: 'Comédia', filters: filters({ genres: [35] }) },
  { id: 'terror', title: 'Terror', filters: filters({ genres: [27] }) },
  { id: 'animacao', title: 'Animação', filters: filters({ genres: [16] }) },
  { id: 'drama', title: 'Drama', filters: filters({ genres: [18] }) },
  { id: 'mais-bem-avaliados', title: 'Mais bem avaliados', filters: filters({ sort: 'nota' }) },
];

export function seeAllHref(row: HomeRow): string {
  const query = filtersToQuery(row.filters);
  return query ? `/catalogo?${query}` : '/catalogo';
}
