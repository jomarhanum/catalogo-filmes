'use client';

import { useEffect, useState, useTransition, type MouseEvent } from 'react';
import { loadMoreMovies } from '@/app/actions';
import type { MovieCardData } from '@/lib/queries/types';
import {
  loadCatalogState,
  markFilmOpenedFromCatalog,
  restorableMovies,
  saveCatalogState,
  saveQuery,
  takeReturnFromFilm,
} from './catalogSession';
import { MovieCard } from './MovieCard';

interface Props {
  initialMovies: MovieCardData[];
  total: number;
  query: string;
}

export function MovieGrid({ initialMovies, total, query }: Props) {
  const [movies, setMovies] = useState(initialMovies);
  const [failed, setFailed] = useState(false);
  const [pending, startTransition] = useTransition();
  // Rolagem a restaurar; aplicada num efeito depois do commit que já tem a lista restaurada.
  const [restoreScrollY, setRestoreScrollY] = useState<number | null>(null);

  useEffect(() => {
    saveQuery(query);
  }, [query]);

  // Voltando de um filme aberto por aqui: recupera os blocos já carregados e a rolagem.
  // Roda depois da hidratação para o primeiro render bater com o HTML do servidor.
  useEffect(() => {
    if (!takeReturnFromFilm()) return;
    const stored = loadCatalogState();
    const restored = restorableMovies(stored, query, initialMovies);
    if (!stored || !restored) return;
    /* eslint-disable react-hooks/set-state-in-effect -- restauração única, só existe no navegador */
    setMovies(restored);
    setRestoreScrollY(stored.scrollY);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [query, initialMovies]);

  useEffect(() => {
    if (restoreScrollY !== null) window.scrollTo(0, restoreScrollY);
  }, [restoreScrollY]);

  const loadMore = () =>
    startTransition(async () => {
      try {
        const next = await loadMoreMovies(query, movies.length);
        // O catálogo pode ter mudado entre um bloco e outro; evita cards repetidos.
        const seen = new Set(movies.map((m) => m.id));
        const merged = [...movies, ...next.filter((m) => !seen.has(m.id))];
        setMovies(merged);
        saveCatalogState({ query, movies: merged, scrollY: window.scrollY });
        setFailed(false);
      } catch {
        setFailed(true);
      }
    });

  // Clique simples num card: guarda lista e rolagem para o "voltar" e marca a origem do filme.
  const rememberPosition = (e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const card = (e.target as Element).closest<HTMLAnchorElement>('a[data-testid="movie-card"]');
    if (!card) return;
    saveCatalogState({ query, movies, scrollY: window.scrollY });
    markFilmOpenedFromCatalog(new URL(card.href).pathname);
  };

  return (
    <>
      <div
        onClickCapture={rememberPosition}
        className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6"
      >
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
