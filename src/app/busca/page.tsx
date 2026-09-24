import type { Metadata } from 'next';
import Link from 'next/link';
import { MovieGrid } from '@/components/catalog/MovieGrid';
import { parseSearchQuery, type RawSearchParams } from '@/lib/filters';
import { formatMovieCount } from '@/lib/format';
import { searchTitles } from '@/lib/queries/searchTitles';
import { createServerSupabase } from '@/lib/supabase/server';

type Props = { searchParams: Promise<RawSearchParams> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const term = parseSearchQuery((await searchParams).q);
  return { title: term ? `Busca: ${term}` : 'Busca' };
}

export default async function SearchPage({ searchParams }: Props) {
  const term = parseSearchQuery((await searchParams).q);

  if (!term) {
    return (
      <main className="px-4 py-16 sm:px-8">
        <p className="text-lg">Digite pelo menos 2 letras para buscar.</p>
      </main>
    );
  }

  const result = await searchTitles(createServerSupabase(), term, 0);

  return (
    <main className="space-y-4 px-4 pb-10 pt-6 sm:px-8">
      <h1 className="font-display text-2xl font-bold">Resultados para “{term}”</h1>
      {result.total === 0 ? (
        <div className="py-10">
          <p className="text-lg">Nenhum filme encontrado para “{term}”.</p>
          <Link href="/catalogo" className="mt-3 inline-block text-fg underline hover:text-accent">
            Ver o catálogo
          </Link>
        </div>
      ) : (
        <>
          <p className="text-sm text-muted">{formatMovieCount(result.total)}</p>
          <MovieGrid key={term} kind="search" initialMovies={result.movies} total={result.total} query={term} />
        </>
      )}
    </main>
  );
}
