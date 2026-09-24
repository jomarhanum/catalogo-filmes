'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { MovieCard } from '@/components/catalog/MovieCard';
import type { MovieCardData } from '@/lib/queries/types';

interface Props {
  title: string;
  href: string;
  movies: MovieCardData[];
}

export function MovieRow({ title, href, movies }: Props) {
  const headingId = useId();
  const stripRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  // Seta que deve receber o foco quando a seta focada ficar inativa (fim ou início da fileira).
  const focusAfterRender = useRef<HTMLButtonElement | null>(null);
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    const next = { atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 };
    const focused = document.activeElement;
    if (next.atEnd && focused === nextRef.current) focusAfterRender.current = prevRef.current;
    else if (next.atStart && focused === prevRef.current) focusAfterRender.current = nextRef.current;
    setEdges(next);
  }, []);

  // A seta inativa fica `disabled`; se era ela que tinha o foco, passa o foco para a seta oposta
  // antes da pintura, para ele nunca cair no <body>.
  useLayoutEffect(() => {
    const target = focusAfterRender.current;
    focusAfterRender.current = null;
    if (target && !target.disabled) target.focus();
  }, [edges]);

  // O ResizeObserver mede ao começar a observar e sempre que a largura muda.
  useEffect(() => {
    const el = stripRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => measure());
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const scrollByPage = (direction: 1 | -1) => {
    const el = stripRef.current;
    if (!el) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  const arrow =
    'absolute inset-y-0 z-10 hidden w-12 items-center justify-center text-4xl text-white opacity-0 transition-opacity group-hover/row:opacity-100 focus-visible:opacity-100 sm:flex';

  return (
    <section aria-labelledby={headingId} className="group/row">
      <div className="flex items-baseline gap-4 px-4 sm:px-8">
        <h2 id={headingId} className="font-display text-xl font-bold">
          {title}
        </h2>
        <Link href={href} className="text-sm text-muted hover:text-fg">
          Ver todos
        </Link>
      </div>
      <div className="relative mt-3">
        <div
          ref={stripRef}
          data-testid="row-strip"
          onScroll={measure}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 sm:scroll-px-8 sm:px-8"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="w-[120px] shrink-0 snap-start sm:w-[150px]">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
        {/* As duas setas ficam sempre montadas; a inativa fica invisível e desabilitada. */}
        <button
          ref={prevRef}
          type="button"
          aria-label={`Rolar ${title} para a esquerda`}
          onClick={() => scrollByPage(-1)}
          disabled={edges.atStart}
          className={`${arrow} left-0 bg-linear-to-r from-bg to-transparent ${edges.atStart ? 'invisible' : ''}`}
        >
          ‹
        </button>
        <button
          ref={nextRef}
          type="button"
          aria-label={`Rolar ${title} para a direita`}
          onClick={() => scrollByPage(1)}
          disabled={edges.atEnd}
          className={`${arrow} right-0 bg-linear-to-l from-bg to-transparent ${edges.atEnd ? 'invisible' : ''}`}
        >
          ›
        </button>
      </div>
    </section>
  );
}
