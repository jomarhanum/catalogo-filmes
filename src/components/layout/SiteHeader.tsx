'use client';

import Form from 'next/form';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { Suspense, useRef, useState, useSyncExternalStore } from 'react';

function subscribeScroll(onChange: () => void) {
  window.addEventListener('scroll', onChange, { passive: true });
  return () => window.removeEventListener('scroll', onChange);
}

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </svg>
  );
}

function SearchForm({ initialQuery }: { initialQuery: string }) {
  const [open, setOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <Form action="/busca" role="search" className="flex items-center">
      <button
        type="button"
        aria-label="Abrir busca"
        aria-expanded={open}
        onClick={() => {
          setOpen(true);
          requestAnimationFrame(() => inputRef.current?.focus());
        }}
        className={`rounded p-2 sm:hidden ${open ? 'hidden' : ''}`}
      >
        <SearchIcon />
      </button>
      <div
        className={`${open ? 'flex' : 'hidden'} absolute inset-x-0 top-0 h-16 items-center gap-3 bg-bg px-4 sm:static sm:flex sm:h-auto sm:bg-transparent sm:px-0`}
      >
        <label className="relative flex w-full items-center sm:w-64">
          <span className="sr-only">Buscar filme</span>
          <span className="pointer-events-none absolute left-3 text-muted">
            <SearchIcon />
          </span>
          <input
            ref={inputRef}
            type="search"
            name="q"
            defaultValue={initialQuery}
            placeholder="Buscar filme…"
            minLength={2}
            maxLength={100}
            className="w-full rounded-md border border-white/25 bg-black/60 py-1.5 pl-10 pr-3 text-sm placeholder:text-muted"
          />
        </label>
        <button type="button" onClick={() => setOpen(false)} className="text-sm text-muted sm:hidden">
          Fechar
        </button>
      </div>
    </Form>
  );
}

function SearchFormFromUrl() {
  const pathname = usePathname();
  const params = useSearchParams();
  const query = pathname === '/busca' ? (params.get('q') ?? '') : '';
  return <SearchForm key={query} initialQuery={query} />;
}

export function SiteHeader() {
  const pathname = usePathname();
  const isHome = pathname === '/';
  const scrolled = useSyncExternalStore(subscribeScroll, () => window.scrollY > 40, () => false);
  const solid = !isHome || scrolled;
  const navLink = (href: string, label: string, active: boolean) => (
    <Link
      href={href}
      aria-current={active ? 'page' : undefined}
      className={active ? 'font-semibold text-fg' : 'text-fg/80 hover:text-fg'}
    >
      {label}
    </Link>
  );

  return (
    <header
      className={`fixed inset-x-0 top-0 z-40 transition-colors duration-300 ${
        solid ? 'bg-bg' : 'bg-linear-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="relative flex h-16 items-center gap-4 px-4 sm:gap-8 sm:px-8">
        <Link href="/" className="font-display text-xl font-extrabold tracking-tight sm:text-2xl">
          Cine<span className="text-accent">Catálogo</span>
        </Link>
        <nav aria-label="Principal" className="flex gap-4 text-sm sm:gap-5">
          {navLink('/', 'Início', isHome)}
          {navLink('/catalogo', 'Catálogo', pathname.startsWith('/catalogo'))}
        </nav>
        <div className="ml-auto">
          <Suspense fallback={<SearchForm initialQuery="" />}>
            <SearchFormFromUrl />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
