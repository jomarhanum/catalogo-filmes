'use client';

import { useEffect, useState, useTransition } from 'react';
import { loadMoreMovies } from '@/app/actions';
import type { MovieCardData } from '@/lib/queries/types';
import { MovieCard } from './MovieCard';

export const CATALOG_QUERY_KEY = 'catalog-query';

interface Props {
  initialMovies: MovieCardData[];
  total: number;
  query: string;
}

export function MovieGrid({ initialMovies, total, query }: Props) {
  const [movies, setMovies] = useState(initialMovies);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    try {
      sessionStorage.setItem(CATALOG_QUERY_KEY, query);
    } catch {
      // sessionStorage indisponível (modo privado etc.): o "voltar" cai no catálogo sem filtros.
    }
  }, [query]);

  const loadMore = () =>
    startTransition(async () => {
      try {
        const next = await loadMoreMovies(query, movies.length);
        // O catálogo pode ter mudado entre um bloco e outro; evita cards repetidos.
        setMovies((current) => {
          const seen = new Set(current.map((m) => m.id));
          return [...current, ...next.filter((m) => !seen.has(m.id))];
        });
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });

  return (
    <>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {movies.map((movie) => (
          <MovieCard key={movie.id} movie={movie} />
        ))}
      </div>
      {movies.length < total && (
        <div className="mt-8 text-center">
          <button
            type="button"
            onClick={loadMore}
            disabled={pending}
            className="rounded-md border border-border bg-surface px-6 py-2 text-sm disabled:opacity-60"
          >
            {pending ? 'Carregando…' : 'Carregar mais'}
          </button>
          {failed && <p className="mt-2 text-sm text-red-400">Não deu para carregar mais filmes. Tente de novo.</p>}
        </div>
      )}
    </>
  );
}
