import { EmptyState } from '@/components/catalog/EmptyState';
import { MovieGrid } from '@/components/catalog/MovieGrid';
import { filtersToQuery, parseFilters, type RawSearchParams } from '@/lib/filters';
import { searchMovies } from '@/lib/queries/searchMovies';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function CatalogPage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const filters = parseFilters(await searchParams);
  const query = filtersToQuery(filters);
  const result = await searchMovies(createServerSupabase(), filters, 0);

  return (
    <main className="mx-auto max-w-6xl space-y-4 px-4 pb-10">
      <div className="flex items-center justify-between text-sm text-muted">
        <span>{result.total.toLocaleString('pt-BR')} filmes</span>
      </div>
      {result.total === 0 ? (
        <EmptyState />
      ) : (
        <MovieGrid key={query} initialMovies={result.movies} total={result.total} query={query} />
      )}
    </main>
  );
}
