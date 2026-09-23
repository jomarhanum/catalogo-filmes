import { CatalogControls } from '@/components/catalog/CatalogControls';
import { EmptyState } from '@/components/catalog/EmptyState';
import { MovieGrid } from '@/components/catalog/MovieGrid';
import { SortSelect } from '@/components/catalog/SortSelect';
import { filtersToQuery, parseFilters, type RawSearchParams } from '@/lib/filters';
import { listGenres, listProviders } from '@/lib/queries/lists';
import { searchMovies } from '@/lib/queries/searchMovies';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function CatalogPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseFilters(await searchParams);
  const query = filtersToQuery(filters);
  const db = createServerSupabase();
  const [result, providers, genres] = await Promise.all([
    searchMovies(db, filters, 0),
    listProviders(db),
    listGenres(db),
  ]);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 pb-10">
      <CatalogControls filters={filters} providers={providers} genres={genres} />
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted">
        <span>{result.total.toLocaleString('pt-BR')} filmes</span>
        <SortSelect filters={filters} />
      </div>
      {result.total === 0 ? (
        <EmptyState />
      ) : (
        <MovieGrid key={query} initialMovies={result.movies} total={result.total} query={query} />
      )}
    </main>
  );
}
