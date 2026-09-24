# Vitrine estilo Netflix — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dar ao site o clima Netflix: vitrine em `/` com destaque e fileiras, catálogo com filtros em `/catalogo`, busca por título em `/busca` e uma página de filme redesenhada.

**Architecture:** O site continua só lendo o Supabase.
- **Vitrine:** reaproveita `search_movies` (uma consulta por fileira, em paralelo) e ganha uma consulta nova para o filme em destaque.
- **Busca:** função nova `search_titles` no Postgres, com `unaccent` e `pg_trgm`.
- **Visual:** muda por tokens do Tailwind (paleta vermelha) e pelas fontes Outfit/Inter via `next/font`.
- **Topo:** vira um componente cliente fixo, com a busca.

**Tech Stack:** Next.js 16.3 (App Router), React 19, TypeScript, Tailwind CSS 4, Supabase (Postgres 17, supabase-js 2), Zod 4, Vitest 5, Playwright.

**Spec:** `docs/superpowers/specs/2026-09-23-vitrine-netflix-design.md` (altera `docs/superpowers/specs/2026-09-23-catalogo-filmes-design.md`)

## Global Constraints

- **Next.js 16.3 tem mudanças incompatíveis.** Antes de usar qualquer API do Next, leia o guia correspondente em `node_modules/next/dist/docs/` (regra do `AGENTS.md`).
- **Rotas:** `/` (vitrine), `/catalogo` (catálogo com filtros), `/busca?q=` (busca), `/filme/[id]`, `/sobre`.
- **Paleta:** `bg #141414`, `fg #ffffff`, `surface #1f1f1f`, `surface-2 #181818`, `border #2e2e2e`, `muted #a3a3a3`, `accent #e0182d`, `star #f5c518`. A estrela da nota usa `star`; o amarelo não aparece em mais nenhum lugar.
- **Fontes:** Outfit (500/700/800) para logo e títulos; Inter (400/500/600) para o resto. Ambas via `next/font/google`.
- **Marca:** "CineCatálogo" ("Cine" em branco, "Catálogo" em vermelho). Nunca usar o nome ou o logo da Netflix como identidade.
- **Textos da interface** em português do Brasil, com frases em caixa normal; identificadores de código em inglês.
- **Fileiras da vitrine, na ordem:** Em alta agora; Na Netflix (8); No Prime Video (119); No Disney+ (337); Na Max (1899); Ação (28); Comédia (35); Terror (27); Animação (16); Drama (18); Mais bem avaliados (ordem `nota`).
  - As fileiras de streaming usam `acesso=flatrate`.
  - Cada fileira tem 20 filmes.
  - Fileira vazia não aparece.
- **Busca:**
  - Termo com espaços removidos nas pontas e cortado em 100 caracteres; menos de 2 caracteres conta como "sem busca".
  - Procura sem acentos no título em português e no original.
  - Só traz filmes que estão em algum streaming, ordenados por popularidade, no máximo 100 por chamada.
- **Foco visível** em tudo que é clicável; `prefers-reduced-motion` desliga transições e zoom.
- Commits terminam com o trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (linha em branco antes). Não fazer push.

## Review Focus

- Termos de busca com os curingas do LIKE (`%`, `_`, `\`) → tratados como texto literal, nunca como "traga tudo". Teste na Task 5.
- `?q=` vazio, só espaços ou com 500 caracteres → mensagem "Digite pelo menos 2 letras" ou termo cortado em 100, sem erro 500. Teste na Task 5.
- Favorito antigo com filtros em `/` (ex.: `/?streaming=8,abc&x=1`) → redireciona para `/catalogo?streaming=8`, mantendo só os filtros válidos. Teste na Task 2.
- Streaming ou gênero sem filmes → a fileira some, sem título solto. Teste na Task 3 (a fileira do Prime Video não aparece com os dados de exemplo).
- Filme aberto por um link de fora do site e depois "Voltar" → vai para `/` em vez de sair do site pelo histórico. Teste na Task 6.

---

## Mapa de arquivos

```
src/app/globals.css                         tokens novos, fontes, foco, movimento reduzido
src/app/layout.tsx                          fontes, topo fixo, espaço do topo
src/components/layout/SiteHeader.tsx        topo: logo, links, busca, fundo ao rolar (cliente)
src/app/page.tsx                            vitrine (Task 4); redirecionamento de links antigos
src/app/catalogo/page.tsx                   catálogo (conteúdo que hoje está em src/app/page.tsx)
src/app/busca/page.tsx                      resultados da busca
src/app/actions.ts                          + loadMoreSearch
src/app/filme/[id]/page.tsx                 usa MovieDetailsView
src/lib/filters.ts                          + catalogRedirectTarget, parseSearchQuery
src/lib/home-rows.ts                        configuração das fileiras + seeAllHref
src/lib/navigation-origin.ts                marca "filme aberto de dentro do site"
src/lib/providers.ts                        uniqueProviders
src/lib/queries/searchMovies.ts             + parâmetro limit, toSearchResult exportado
src/lib/queries/featured.ts                 getFeaturedMovie
src/lib/queries/homeRows.ts                 getHomeRows
src/lib/queries/searchTitles.ts             searchTitles
supabase/migrations/20260923000400_search_titles.sql
src/components/FilmLink.tsx                 Link que marca a origem (cliente)
src/components/catalog/MovieCard.tsx        usa FilmLink, estrela em `star`
src/components/catalog/MovieGrid.tsx        + kind 'catalog' | 'search'
src/components/home/FeaturedHero.tsx        destaque
src/components/home/MovieRow.tsx            fileira com rolagem lateral (cliente)
src/components/movie/MovieDetailsView.tsx   novo layout da página do filme
src/components/movie/WhereToWatch.tsx       chips com logo + nome
src/components/movie/TrailerEmbed.tsx       miniatura → iframe (cliente)
src/components/movie/TrailerModal.tsx       rótulo/estilo do botão configuráveis
src/components/movie/BackLink.tsx           "‹ Voltar" generalizado
src/components/movie/MovieHero.tsx          removido na Task 6
e2e/support/db.ts                           cliente service para preparar dados no e2e
e2e/home.spec.ts, e2e/search.spec.ts        novos
```

---

### Task 1: Tema, fontes e topo novo

**Files:**
- Modify: `src/app/globals.css`, `src/app/layout.tsx`, `src/app/error.tsx`, `src/components/catalog/AccessTypeChips.tsx`, `src/components/catalog/EmptyState.tsx`, `src/components/catalog/FiltersDrawer.tsx`, `src/components/catalog/MovieCard.tsx`, `src/components/movie/MovieHero.tsx`
- Create: `src/components/layout/SiteHeader.tsx`
- Test: `e2e/shell.spec.ts`

**Interfaces:**
- Produces:
  - Tokens do Tailwind: `bg`, `fg`, `surface`, `surface-2`, `border`, `muted`, `accent`, `star`; `font-sans` (Inter) e `font-display` (Outfit).
  - Classe utilitária `no-scrollbar`.
  - `<SiteHeader />`: topo fixo de 64px (`h-16`). O layout envolve as páginas em `pt-16`, então uma página que queira ficar por baixo do topo (o destaque da vitrine) usa `-mt-16`.
  - O campo de busca é um `<input type="search" name="q">` com o rótulo acessível "Buscar filme", dentro de um formulário `role="search"` que vai para `/busca`.

- [ ] **Step 1: Escrever o teste que falha** — substituir o conteúdo de `e2e/shell.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('página sobre mostra os créditos obrigatórios', async ({ page }) => {
  await page.goto('/sobre');
  await expect(
    page.getByText('This product uses the TMDB API but is not endorsed or certified by TMDB'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'JustWatch' })).toBeVisible();
});

test('rota inexistente mostra a página de não encontrado', async ({ page }) => {
  await page.goto('/nao-existe');
  await expect(page.getByText('Não encontramos essa página')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Voltar ao catálogo' })).toBeVisible();
});

test('topo tem logo, links e busca', async ({ page }) => {
  await page.goto('/sobre');
  const header = page.getByRole('banner');
  await expect(header.getByRole('link', { name: 'Início' })).toHaveAttribute('href', '/');
  await expect(header.getByRole('link', { name: 'Catálogo', exact: true })).toHaveAttribute('href', '/catalogo');
  await expect(header.getByRole('searchbox', { name: 'Buscar filme' })).toBeVisible();
  await expect(header.getByRole('link', { name: 'CineCatálogo' })).toHaveAttribute('href', '/');
});

test('no celular a busca abre por um botão de lupa', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/sobre');
  const header = page.getByRole('banner');
  await expect(header.getByRole('searchbox', { name: 'Buscar filme' })).toBeHidden();
  await header.getByRole('button', { name: 'Abrir busca' }).click();
  await expect(header.getByRole('searchbox', { name: 'Buscar filme' })).toBeFocused();
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/shell.spec.ts`
Expected: FAIL nos dois testes novos (não existe link "Início" nem campo de busca).

- [ ] **Step 3: Implementar**

`src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #141414;
  --color-fg: #ffffff;
  --color-surface: #1f1f1f;
  --color-surface-2: #181818;
  --color-border: #2e2e2e;
  --color-muted: #a3a3a3;
  --color-accent: #e0182d;
  --color-star: #f5c518;
}

@theme inline {
  --font-sans: var(--font-inter), ui-sans-serif, system-ui, sans-serif;
  --font-display: var(--font-outfit), ui-sans-serif, system-ui, sans-serif;
}

html {
  color-scheme: dark;
}

:focus-visible {
  outline: 2px solid #ffffff;
  outline-offset: 2px;
}

.no-scrollbar {
  scrollbar-width: none;
}
.no-scrollbar::-webkit-scrollbar {
  display: none;
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

`src/components/layout/SiteHeader.tsx`:

```tsx
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
```

Confira em `node_modules/next/dist/docs/` a API de `next/form` (componente `Form` com `action` string → navegação GET no cliente) e a exigência de `Suspense` para `useSearchParams`. Se algo divergir, siga a documentação instalada e registre no relatório.

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'CineCatálogo — o que tem nos streamings', template: '%s · CineCatálogo' },
  description: 'Descubra quais filmes estão disponíveis agora nos streamings do Brasil e como assistir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <SiteHeader />
        <div className="pt-16">{children}</div>
        <footer className="px-4 py-8 text-xs text-muted sm:px-8">
          Dados: TMDB e JustWatch ·{' '}
          <Link href="/sobre" className="underline">
            Sobre
          </Link>
        </footer>
      </body>
    </html>
  );
}
```

**Botões vermelhos com texto branco.** Em todos os arquivos listados abaixo, troque `text-black` por `text-white` nas classes que já usam `bg-accent`:
- `src/app/error.tsx` (botão "Tentar de novo");
- `src/components/catalog/AccessTypeChips.tsx` (chip marcado);
- `src/components/catalog/EmptyState.tsx` ("Limpar filtros");
- `src/components/catalog/FiltersDrawer.tsx` (chip de gênero marcado e botão "Aplicar").

**Estrela da nota em amarelo:**
- `src/components/catalog/MovieCard.tsx`: no `<span>` da nota, troque `text-accent` por `text-star`.
- `src/components/movie/MovieHero.tsx`: no `<span>` da nota, troque `text-accent` por `text-star`.

Rode `grep -rn "text-black" src` e confirme que sobrou só o que não usa `bg-accent`.

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test e2e/shell.spec.ts && npm run typecheck && npm run lint`
Expected: 4 testes PASS; typecheck e lint limpos.

- [ ] **Step 5: Rodar toda a suíte e2e** (a troca de cores e o topo novo não podem quebrar nada)

Run: `npm run test:e2e`
Expected: tudo PASS. Se algum teste antigo procurar o link "🎬 Catálogo", ele já foi removido do `shell.spec.ts` no Step 1.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): tema vermelho, fontes Outfit/Inter e topo com busca

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Catálogo passa para `/catalogo` e links antigos redirecionam

**Files:**
- Create: `src/app/catalogo/page.tsx` (conteúdo movido de `src/app/page.tsx`)
- Modify: `src/app/page.tsx` (vira redirecionamento temporário), `src/lib/filters.ts`, `src/lib/filters.test.ts`, `src/components/catalog/useFilterNavigation.ts`, `src/components/catalog/EmptyState.tsx`, `src/components/movie/BackLink.tsx`
- Test: `src/lib/filters.test.ts`, `e2e/catalog.spec.ts`, `e2e/filters.spec.ts`, `e2e/movie.spec.ts`

**Interfaces:**
- Consumes: `parseFilters`, `filtersToQuery`, `RawSearchParams` (existentes em `src/lib/filters.ts`).
- Produces:
  - `CATALOG_PARAM_KEYS`: lista readonly com os 9 nomes de parâmetro.
  - `catalogRedirectTarget(raw: RawSearchParams): string | null`: devolve `'/catalogo'` ou `'/catalogo?<filtros válidos normalizados>'` quando `raw` tem **qualquer** chave do catálogo, e `null` quando não tem nenhuma.

- [ ] **Step 1: Escrever os testes que falham** — acrescentar em `src/lib/filters.test.ts` (importando `catalogRedirectTarget` junto dos outros imports de `./filters`)

```ts
describe('catalogRedirectTarget', () => {
  it('sem parâmetros do catálogo não redireciona', () => {
    expect(catalogRedirectTarget({})).toBeNull();
    expect(catalogRedirectTarget({ q: 'corra', utm_source: 'x' })).toBeNull();
  });

  it('leva os filtros válidos para /catalogo', () => {
    expect(catalogRedirectTarget({ streaming: '8' })).toBe('/catalogo?streaming=8');
    expect(catalogRedirectTarget({ streaming: '8,abc', genero: '27', x: '1' })).toBe('/catalogo?streaming=8&genero=27');
  });

  it('parâmetro do catálogo só com valores inválidos vai para /catalogo limpo', () => {
    expect(catalogRedirectTarget({ nota: 'abc' })).toBe('/catalogo');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit src/lib/filters.test.ts`
Expected: FAIL com `catalogRedirectTarget is not a function` (ou erro de import).

- [ ] **Step 3: Implementar** — acrescentar ao fim de `src/lib/filters.ts`

```ts
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run --project unit src/lib/filters.test.ts`
Expected: PASS

- [ ] **Step 5: Mover o catálogo**

```bash
mkdir -p src/app/catalogo
git mv src/app/page.tsx src/app/catalogo/page.tsx
```

Em `src/app/catalogo/page.tsx`, acrescente logo depois dos imports:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Catálogo' };
```

(Junte o `import type { Metadata }` ao bloco de imports existente.) O resto do arquivo não muda.

Crie o novo `src/app/page.tsx`. Ele é **temporário**: a Task 4 o substitui pela vitrine.

```tsx
import { redirect } from 'next/navigation';
import { catalogRedirectTarget, type RawSearchParams } from '@/lib/filters';

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  redirect(catalogRedirectTarget(await searchParams) ?? '/catalogo');
}
```

- [ ] **Step 6: Apontar a navegação do catálogo para `/catalogo`**

`src/components/catalog/useFilterNavigation.ts`, troque a linha do `router.push` por:

```ts
      router.push(query ? `/catalogo?${query}` : '/catalogo', { scroll: false });
```

`src/components/catalog/EmptyState.tsx`, troque `href="/"` por `href="/catalogo"`.

`src/components/movie/BackLink.tsx`:
- troque `href="/"` por `href="/catalogo"`;
- troque `` router.push(`/?${query}`) `` por `` router.push(`/catalogo?${query}`) ``.

(A Task 6 reescreve esse componente; aqui é só para o catálogo continuar funcionando no endereço novo.)

- [ ] **Step 7: Atualizar os testes e2e para o endereço novo**

```bash
sed -i "s#goto('/')#goto('/catalogo')#g; s#goto('/?#goto('/catalogo?#g; s#toHaveURL('/')#toHaveURL('/catalogo')#g; s#toHaveURL('/?#toHaveURL('/catalogo?#g" e2e/catalog.spec.ts e2e/filters.spec.ts e2e/movie.spec.ts
grep -n "goto('/\|toHaveURL('/" e2e/catalog.spec.ts e2e/filters.spec.ts e2e/movie.spec.ts
```

Confira na saída do `grep` que nenhuma chamada nesses três arquivos aponta para `/` ou `/?`, exceto `/filme/...`.

Acrescente ao fim de `e2e/catalog.spec.ts`:

```ts
test('links antigos com filtros em / vão para /catalogo', async ({ page }) => {
  await page.goto('/?streaming=8,abc&x=1');
  await expect(page).toHaveURL('/catalogo?streaming=8');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('o link Catálogo do topo abre o catálogo', async ({ page }) => {
  await page.goto('/sobre');
  await page.getByRole('banner').getByRole('link', { name: 'Catálogo', exact: true }).click();
  await expect(page).toHaveURL('/catalogo');
  await expect(page.getByText('38 filmes')).toBeVisible();
});
```

- [ ] **Step 8: Rodar tudo**

Run: `npm run test:unit && npm run typecheck && npm run lint && npm run test:e2e`
Expected: tudo PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat(web): catálogo em /catalogo e redirecionamento de links antigos

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Dados da vitrine — limite nas consultas, destaque e fileiras

**Files:**
- Modify: `src/lib/queries/searchMovies.ts`, `src/lib/queries/searchMovies.int.test.ts`
- Create: `src/lib/home-rows.ts`, `src/lib/home-rows.test.ts`, `src/lib/providers.ts`, `src/lib/providers.test.ts`, `src/lib/queries/featured.ts`, `src/lib/queries/featured.int.test.ts`, `src/lib/queries/homeRows.ts`, `src/lib/queries/homeRows.int.test.ts`

**Interfaces:**
- Consumes: `searchMovies`, `PAGE_SIZE`, `getMovie`, `DEFAULT_FILTERS`, `filtersToQuery`, `CatalogFilters`, `AccessType`, `ACCESS_TYPES`, tipos `Db`, `MovieCardData`, `MovieDetails`, `ProviderRef`, `SearchResult`; `anonDb()`/`serviceDb()` de `tests/support/db.ts`.
- Produces:
  - `searchMovies(db, filters, offset, limit = PAGE_SIZE)`;
  - `toSearchResult(rows: SearchRow[]): SearchResult` e o tipo `SearchRow`, exportados de `searchMovies.ts`;
  - `interface HomeRow { id: string; title: string; filters: CatalogFilters }`;
  - `HOME_ROWS: HomeRow[]`, `HOME_ROW_SIZE = 20`, `seeAllHref(row: HomeRow): string`;
  - `uniqueProviders(watch: Record<AccessType, ProviderRef[]>): ProviderRef[]`;
  - `getFeaturedMovie(db: Db): Promise<MovieDetails | null>`;
  - `interface HomeRowData { row: HomeRow; movies: MovieCardData[] }` e `getHomeRows(db: Db): Promise<HomeRowData[]>` (sem as fileiras vazias).

- [ ] **Step 1: Escrever os testes unitários que falham**

`src/lib/home-rows.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { HOME_ROWS, HOME_ROW_SIZE, seeAllHref } from './home-rows';

const byId = (id: string) => {
  const row = HOME_ROWS.find((r) => r.id === id);
  if (!row) throw new Error(`fileira ${id} não existe`);
  return row;
};

describe('HOME_ROWS', () => {
  it('11 fileiras na ordem da spec', () => {
    expect(HOME_ROWS.map((r) => r.title)).toEqual([
      'Em alta agora',
      'Na Netflix',
      'No Prime Video',
      'No Disney+',
      'Na Max',
      'Ação',
      'Comédia',
      'Terror',
      'Animação',
      'Drama',
      'Mais bem avaliados',
    ]);
    expect(HOME_ROW_SIZE).toBe(20);
  });

  it('fileiras de streaming pedem só assinatura', () => {
    expect(byId('netflix').filters).toMatchObject({ providers: [8], access: ['flatrate'] });
    expect(byId('max').filters).toMatchObject({ providers: [1899], access: ['flatrate'] });
  });
});

describe('seeAllHref', () => {
  it('gera o link do catálogo com o filtro da fileira', () => {
    expect(seeAllHref(byId('em-alta'))).toBe('/catalogo');
    expect(seeAllHref(byId('netflix'))).toBe('/catalogo?streaming=8&acesso=flatrate');
    expect(seeAllHref(byId('terror'))).toBe('/catalogo?genero=27');
    expect(seeAllHref(byId('mais-bem-avaliados'))).toBe('/catalogo?ordem=nota');
  });
});
```

`src/lib/providers.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { uniqueProviders } from './providers';

const netflix = { id: 8, name: 'Netflix', logoPath: null };
const prime = { id: 119, name: 'Amazon Prime Video', logoPath: null };

describe('uniqueProviders', () => {
  it('junta os tipos de acesso sem repetir, na ordem assinatura → aluguel → compra', () => {
    expect(uniqueProviders({ flatrate: [netflix], rent: [prime], buy: [prime] })).toEqual([netflix, prime]);
  });

  it('vazio quando não há streamings', () => {
    expect(uniqueProviders({ flatrate: [], rent: [], buy: [] })).toEqual([]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit src/lib/home-rows.test.ts src/lib/providers.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: Implementar**

`src/lib/home-rows.ts`:

```ts
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
```

`src/lib/providers.ts`:

```ts
import { ACCESS_TYPES, type AccessType } from './filters';
import type { ProviderRef } from './queries/types';

export function uniqueProviders(watch: Record<AccessType, ProviderRef[]>): ProviderRef[] {
  const seen = new Map<number, ProviderRef>();
  for (const type of ACCESS_TYPES) {
    for (const provider of watch[type]) if (!seen.has(provider.id)) seen.set(provider.id, provider);
  }
  return [...seen.values()];
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run --project unit src/lib/home-rows.test.ts src/lib/providers.test.ts`
Expected: PASS

- [ ] **Step 5: Escrever os testes de integração que falham** (Supabase local rodando com os dados de exemplo)

Acrescente ao `describe('searchMovies')` de `src/lib/queries/searchMovies.int.test.ts`:

```ts
  it('aceita um limite por chamada', async () => {
    const result = await searchMovies(db, DEFAULT_FILTERS, 0, 20);
    expect(result.movies).toHaveLength(20);
    expect(result.total).toBe(38);
  });
```

`src/lib/queries/homeRows.int.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { getHomeRows } from './homeRows';

describe('getHomeRows', () => {
  it('só as fileiras com filmes, na ordem, com até 20 filmes', async () => {
    const rows = await getHomeRows(anonDb());
    expect(rows.map((r) => r.row.title)).toEqual([
      'Em alta agora',
      'Na Netflix',
      'No Disney+',
      'Na Max',
      'Ação',
      'Terror',
      'Drama',
      'Mais bem avaliados',
    ]);
    for (const { movies } of rows) expect(movies.length).toBeLessThanOrEqual(20);
    expect(rows[0].movies[0].id).toBe(7);
    expect(rows[1].movies.map((m) => m.id)).toEqual([1, 3, 6]);
    expect(rows.find((r) => r.row.id === 'terror')?.movies.map((m) => m.id)).toEqual([1, 2, 4]);
  });
});
```

`src/lib/queries/featured.int.test.ts`:

```ts
import { afterAll, describe, expect, it } from 'vitest';
import { anonDb, serviceDb } from '../../../tests/support/db';
import { getFeaturedMovie } from './featured';

const service = serviceDb();
const LINKED = 900100;
const UNLINKED = 900101;

async function cleanup() {
  await service.from('movies').delete().in('id', [LINKED, UNLINKED]);
}

afterAll(cleanup);

describe('getFeaturedMovie', () => {
  it('sem filme com imagem de fundo, não há destaque', async () => {
    await cleanup();
    expect(await getFeaturedMovie(anonDb())).toBeNull();
  });

  it('escolhe o mais popular com imagem de fundo e sinopse que está em algum streaming', async () => {
    const base = { original_language: 'en', vote_average: 7, vote_count: 100, overview: 'Sinopse.', backdrop_path: '/b.jpg' };
    const { error } = await service.from('movies').insert([
      { ...base, id: LINKED, title: 'Destaque Teste', original_title: 'Featured Test', popularity: 1000 },
      { ...base, id: UNLINKED, title: 'Sem Streaming Teste', original_title: 'Unlinked Test', popularity: 2000 },
    ]);
    expect(error).toBeNull();
    await service.from('movie_providers').insert({ movie_id: LINKED, provider_id: 8, access_type: 'flatrate' });

    const featured = await getFeaturedMovie(anonDb());
    expect(featured?.id).toBe(LINKED);
    expect(featured?.watch.flatrate.map((p) => p.id)).toEqual([8]);
  });
});
```

- [ ] **Step 6: Rodar e ver falhar**

Run: `npx vitest run --project integration src/lib/queries/searchMovies.int.test.ts src/lib/queries/homeRows.int.test.ts src/lib/queries/featured.int.test.ts`
Expected: FAIL (`homeRows`/`featured` não existem; o `searchMovies` ignora o 4º argumento e devolve 24).

- [ ] **Step 7: Implementar**

`src/lib/queries/searchMovies.ts` inteiro:

```ts
import type { CatalogFilters } from '@/lib/filters';
import type { Db, ProviderRef, SearchResult } from './types';

export const PAGE_SIZE = 24;

interface RawProvider {
  id: number;
  name: string;
  logo_path: string | null;
}

/** Linha devolvida por search_movies e search_titles (mesmas colunas). */
export interface SearchRow {
  id: number;
  title: string;
  release_date: string | null;
  runtime: number | null;
  vote_average: number;
  poster_path: string | null;
  providers: unknown;
  total_count: number;
}

export function toSearchResult(rows: SearchRow[]): SearchResult {
  return {
    total: rows[0]?.total_count ?? 0,
    movies: rows.map((row) => ({
      id: row.id,
      title: row.title,
      releaseDate: row.release_date,
      runtime: row.runtime,
      voteAverage: row.vote_average,
      posterPath: row.poster_path,
      providers: (row.providers as RawProvider[]).map(
        (p): ProviderRef => ({ id: p.id, name: p.name, logoPath: p.logo_path }),
      ),
    })),
  };
}

export async function searchMovies(
  db: Db,
  filters: CatalogFilters,
  offset: number,
  limit: number = PAGE_SIZE,
): Promise<SearchResult> {
  const { data, error } = await db.rpc('search_movies', {
    p_providers: filters.providers.length ? filters.providers : undefined,
    p_access: filters.access.length ? filters.access : undefined,
    p_genres: filters.genres.length ? filters.genres : undefined,
    p_year_min: filters.yearMin ?? undefined,
    p_year_max: filters.yearMax ?? undefined,
    p_min_rating: filters.minRating ?? undefined,
    p_max_runtime: filters.maxRuntime ?? undefined,
    p_language: filters.language ?? undefined,
    p_sort: filters.sort,
    p_limit: limit,
    p_offset: offset,
  });
  if (error) throw new Error(`search_movies: ${error.message}`);
  return toSearchResult(data ?? []);
}
```

Se o tipo gerado das linhas de `search_movies` não for atribuível a `SearchRow[]` (por exemplo, `providers: Json`), mantenha `SearchRow.providers: unknown` e ajuste só o necessário, sem `any`.

`src/lib/queries/featured.ts`:

```ts
import { getMovie } from './getMovie';
import type { Db, MovieDetails } from './types';

/** Filme mais popular que está em algum streaming e tem imagem de fundo e sinopse. */
export async function getFeaturedMovie(db: Db): Promise<MovieDetails | null> {
  const { data, error } = await db
    .from('movies')
    .select('id, movie_providers!inner(movie_id)')
    .not('backdrop_path', 'is', null)
    .not('overview', 'is', null)
    .neq('overview', '')
    .order('popularity', { ascending: false })
    .order('id')
    .limit(1);
  if (error) throw new Error(`getFeaturedMovie: ${error.message}`);
  const id = data?.[0]?.id;
  return id === undefined ? null : getMovie(db, id);
}
```

`src/lib/queries/homeRows.ts`:

```ts
import { HOME_ROWS, HOME_ROW_SIZE, type HomeRow } from '@/lib/home-rows';
import { searchMovies } from './searchMovies';
import type { Db, MovieCardData } from './types';

export interface HomeRowData {
  row: HomeRow;
  movies: MovieCardData[];
}

export async function getHomeRows(db: Db): Promise<HomeRowData[]> {
  const rows = await Promise.all(
    HOME_ROWS.map(async (row) => ({ row, movies: (await searchMovies(db, row.filters, 0, HOME_ROW_SIZE)).movies })),
  );
  return rows.filter((r) => r.movies.length > 0);
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `npm run test:int && npm run test:unit && npm run typecheck && npm run lint`
Expected: tudo PASS.

- [ ] **Step 9: Commit**

```bash
git add -A
git commit -m "feat: dados da vitrine — destaque, fileiras e limite nas consultas

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Vitrine em `/` — destaque e fileiras

**Files:**
- Create: `src/lib/navigation-origin.ts`, `src/lib/navigation-origin.test.ts`, `src/components/FilmLink.tsx`, `src/components/home/FeaturedHero.tsx`, `src/components/home/MovieRow.tsx`, `e2e/support/db.ts`, `e2e/home.spec.ts`
- Modify: `src/app/page.tsx` (substituir), `src/components/catalog/MovieCard.tsx`, `src/components/movie/TrailerModal.tsx`

**Interfaces:**
- Consumes: `getFeaturedMovie`, `getHomeRows`, `seeAllHref`, `uniqueProviders` (Task 3); `catalogRedirectTarget` (Task 2); `ProviderLogo`, `MovieCard`, `TrailerModal`; formatação e `tmdbImage`.
- Produces:
  - `markFilmOpenedFromSite(path: string): void`, `filmOpenedFromSite(path: string): boolean`, `clearFilmOpenedFromSite(): void` e `isPlainLeftClick(e): boolean` em `src/lib/navigation-origin.ts`;
  - `<FilmLink href className>`: o `Link` que todo card e o "Ver detalhes" usam para abrir `/filme/[id]`. Ele marca a origem;
  - `TrailerModal` com as props opcionais `triggerLabel` (padrão `'Ver trailer'`) e `triggerClassName`;
  - `<MovieRow title href movies>`: uma `<section>` rotulada pelo título (`getByRole('region', { name: título })`), com o link "Ver todos";
  - `<FeaturedHero movie>`: uma `<section aria-label="Filme em destaque">`.

- [ ] **Step 1: Escrever os testes que falham**

`src/lib/navigation-origin.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearFilmOpenedFromSite,
  filmOpenedFromSite,
  isPlainLeftClick,
  markFilmOpenedFromSite,
} from './navigation-origin';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('navigation-origin', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('marca e reconhece o filme aberto de dentro do site', () => {
    expect(filmOpenedFromSite('/filme/1')).toBe(false);
    markFilmOpenedFromSite('/filme/1');
    expect(filmOpenedFromSite('/filme/1')).toBe(true);
    expect(filmOpenedFromSite('/filme/2')).toBe(false);
    clearFilmOpenedFromSite();
    expect(filmOpenedFromSite('/filme/1')).toBe(false);
  });

  it('sem sessionStorage não quebra', () => {
    vi.stubGlobal('sessionStorage', undefined);
    expect(() => markFilmOpenedFromSite('/filme/1')).not.toThrow();
    expect(filmOpenedFromSite('/filme/1')).toBe(false);
  });

  it('isPlainLeftClick ignora cliques com modificador ou botão do meio', () => {
    const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    expect(isPlainLeftClick(click)).toBe(true);
    expect(isPlainLeftClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...click, button: 1 })).toBe(false);
  });
});
```

`e2e/support/db.ts`:

```ts
import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch {
  // No CI o arquivo é gerado por `npm run env:local` antes dos testes.
}

export function serviceDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes: rode `npm run env:local`.');
  return createClient(url, key, { auth: { persistSession: false } });
}
```

`e2e/home.spec.ts`:

```ts
import { expect, test } from '@playwright/test';
import { serviceDb } from './support/db';

// Os dados de exemplo não têm imagens de fundo; para exibir o destaque, estes testes dão ao
// filme 7 (o mais popular) uma imagem de fundo e um trailer, e desfazem isso no fim.
test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
  const { error } = await serviceDb()
    .from('movies')
    .update({ backdrop_path: '/destaque-teste.jpg', trailer_key: 'sRfnevzM9kQ' })
    .eq('id', 7);
  if (error) throw error;
});

test.afterAll(async () => {
  await serviceDb().from('movies').update({ backdrop_path: null, trailer_key: null }).eq('id', 7);
});

test('vitrine mostra o destaque e as fileiras com filmes', async ({ page }) => {
  await page.goto('/');
  const hero = page.getByRole('region', { name: 'Filme em destaque' });
  await expect(hero.getByRole('heading', { level: 1, name: 'Mad Max: Estrada da Fúria' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2 })).toHaveText([
    'Em alta agora',
    'Na Netflix',
    'No Disney+',
    'Na Max',
    'Ação',
    'Terror',
    'Drama',
    'Mais bem avaliados',
  ]);
  await expect(page.getByRole('region', { name: 'Terror' }).getByTestId('movie-card')).toHaveCount(3);
});

test('assistir trailer abre o vídeo por cima da página', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Assistir trailer' }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/sRfnevzM9kQ"]')).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('ver detalhes abre a página do filme em destaque', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Filme em destaque' }).getByRole('link', { name: 'Ver detalhes' }).click();
  await expect(page).toHaveURL('/filme/7');
});

test('ver todos leva ao catálogo filtrado', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Na Netflix' }).getByRole('link', { name: 'Ver todos' }).click();
  await expect(page).toHaveURL('/catalogo?streaming=8&acesso=flatrate');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('links antigos com filtros em / continuam indo para o catálogo', async ({ page }) => {
  await page.goto('/?streaming=8');
  await expect(page).toHaveURL('/catalogo?streaming=8');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit src/lib/navigation-origin.test.ts` e `npx playwright test e2e/home.spec.ts`
Expected: FAIL (módulo não existe; `/` ainda redireciona para `/catalogo`).

- [ ] **Step 3: Implementar**

`src/lib/navigation-origin.ts`:

```ts
// Marca, na aba (sessionStorage), que um filme foi aberto por um link de dentro do site.
// O "Voltar" da página do filme usa isso para voltar pelo histórico em vez de sair do site.
const KEY = 'film-opened-from-site';

export function markFilmOpenedFromSite(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Sem sessionStorage: o "Voltar" cai no comportamento simples.
  }
}

export function filmOpenedFromSite(path: string): boolean {
  try {
    return sessionStorage.getItem(KEY) === path;
  } catch {
    return false;
  }
}

export function clearFilmOpenedFromSite(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}

interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Clique simples com o botão principal (sem abrir em nova aba/janela). */
export function isPlainLeftClick(e: ClickLike): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
```

`src/components/FilmLink.tsx`:

```tsx
'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { isPlainLeftClick, markFilmOpenedFromSite } from '@/lib/navigation-origin';

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function FilmLink({ href, className, children, 'data-testid': testId }: Props) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={className}
      onClick={(e) => {
        if (isPlainLeftClick(e)) markFilmOpenedFromSite(href);
      }}
    >
      {children}
    </Link>
  );
}
```

`src/components/catalog/MovieCard.tsx`:
- troque o `import Link from 'next/link';` por `import { FilmLink } from '@/components/FilmLink';`;
- troque `<Link href={`/filme/${movie.id}`} data-testid="movie-card" className="group block">` por `<FilmLink href={`/filme/${movie.id}`} data-testid="movie-card" className="group block">`;
- troque o `</Link>` final por `</FilmLink>`;
- na `<Image>` do pôster, troque `transition group-hover:scale-105` por `transition duration-300 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100`.

`src/components/movie/TrailerModal.tsx`:
- a assinatura passa a ser:

```tsx
interface Props {
  trailerKey: string;
  title: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export function TrailerModal({
  trailerKey,
  title,
  triggerLabel = 'Ver trailer',
  triggerClassName = 'mt-4 rounded-md bg-accent px-4 py-2 font-bold text-white',
}: Props) {
```

- o conteúdo do botão que abre passa a ser:

```tsx
        className={triggerClassName}
      >
        <span aria-hidden="true">▶</span> {triggerLabel}
      </button>
```

O resto do componente (diálogo, foco, Esc) não muda.

`src/components/home/FeaturedHero.tsx`:

```tsx
import Image from 'next/image';
import { FilmLink } from '@/components/FilmLink';
import { ProviderLogo } from '@/components/ProviderLogo';
import { TrailerModal } from '@/components/movie/TrailerModal';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import { uniqueProviders } from '@/lib/providers';
import type { MovieDetails } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';

export function FeaturedHero({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const providers = uniqueProviders(movie.watch);
  const facts = [formatYear(movie.releaseDate), formatRuntime(movie.runtime)].filter((v): v is string => Boolean(v));

  return (
    <section aria-label="Filme em destaque" className="relative isolate -mt-16 flex min-h-[60vh] items-end sm:min-h-[80vh]">
      {backdrop && (
        <Image src={backdrop} alt="" fill priority sizes="100vw" className="-z-10 object-cover object-top" />
      )}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-r from-bg via-bg/60 to-transparent" />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-linear-to-t from-bg via-bg/10 to-transparent" />
      <div className="w-full px-4 pb-32 pt-24 sm:px-8 sm:pb-44">
        <div className="max-w-xl">
          <h1 className="font-display text-[34px] font-extrabold leading-none tracking-tight sm:text-6xl">
            {movie.title}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-fg/90 sm:text-base">
            {facts.map((fact) => (
              <span key={fact}>{fact}</span>
            ))}
            <span>
              <span className="text-star">★</span> {formatRating(movie.voteAverage)}
            </span>
            {providers.length > 0 && (
              <span className="flex gap-1.5">
                {providers.map((p) => (
                  <ProviderLogo key={p.id} provider={p} size={26} />
                ))}
              </span>
            )}
          </div>
          {movie.overview && <p className="mt-4 line-clamp-3 text-base text-fg/90 sm:text-lg">{movie.overview}</p>}
          <div className="mt-6 flex flex-wrap gap-3">
            {movie.trailerKey && (
              <TrailerModal
                trailerKey={movie.trailerKey}
                title={movie.title}
                triggerLabel="Assistir trailer"
                triggerClassName="inline-flex items-center gap-2 rounded-md bg-white px-6 py-2.5 font-semibold text-black hover:bg-white/80"
              />
            )}
            <FilmLink
              href={`/filme/${movie.id}`}
              className="inline-flex items-center gap-2 rounded-md bg-white/25 px-6 py-2.5 font-semibold text-white hover:bg-white/35"
            >
              Ver detalhes
            </FilmLink>
          </div>
        </div>
      </div>
    </section>
  );
}
```

`src/components/home/MovieRow.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useCallback, useEffect, useId, useRef, useState } from 'react';
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
  const [edges, setEdges] = useState({ atStart: true, atEnd: true });

  const measure = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setEdges({ atStart: el.scrollLeft <= 4, atEnd: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
  }, []);

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
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.9, behavior: 'smooth' });
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
          onScroll={measure}
          className="no-scrollbar flex snap-x snap-mandatory scroll-px-4 gap-2 overflow-x-auto px-4 pb-2 sm:scroll-px-8 sm:px-8"
        >
          {movies.map((movie) => (
            <div key={movie.id} className="w-[120px] shrink-0 snap-start sm:w-[150px]">
              <MovieCard movie={movie} />
            </div>
          ))}
        </div>
        {!edges.atStart && (
          <button
            type="button"
            aria-label={`Rolar ${title} para a esquerda`}
            onClick={() => scrollByPage(-1)}
            className={`${arrow} left-0 bg-linear-to-r from-bg to-transparent`}
          >
            ‹
          </button>
        )}
        {!edges.atEnd && (
          <button
            type="button"
            aria-label={`Rolar ${title} para a direita`}
            onClick={() => scrollByPage(1)}
            className={`${arrow} right-0 bg-linear-to-l from-bg to-transparent`}
          >
            ›
          </button>
        )}
      </div>
    </section>
  );
}
```

`src/app/page.tsx` (substituir o conteúdo temporário da Task 2):

```tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FeaturedHero } from '@/components/home/FeaturedHero';
import { MovieRow } from '@/components/home/MovieRow';
import { catalogRedirectTarget, type RawSearchParams } from '@/lib/filters';
import { seeAllHref } from '@/lib/home-rows';
import { getFeaturedMovie } from '@/lib/queries/featured';
import { getHomeRows } from '@/lib/queries/homeRows';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const target = catalogRedirectTarget(await searchParams);
  if (target) redirect(target);

  const db = createServerSupabase();
  const [featured, rows] = await Promise.all([getFeaturedMovie(db), getHomeRows(db)]);

  if (!featured && rows.length === 0) {
    return (
      <main className="px-4 py-24 text-center sm:px-8">
        <p className="text-lg">O catálogo ainda está sendo carregado. Volte em alguns minutos.</p>
        <Link href="/catalogo" className="mt-4 inline-block text-accent underline">
          Ver o catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-12">
      {featured && <FeaturedHero movie={featured} />}
      <div className={featured ? 'relative z-10 -mt-24 space-y-8 sm:-mt-32' : 'space-y-8 pt-6'}>
        {rows.map(({ row, movies }) => (
          <MovieRow key={row.id} title={row.title} href={seeAllHref(row)} movies={movies} />
        ))}
      </div>
    </main>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run --project unit src/lib/navigation-origin.test.ts && npx playwright test e2e/home.spec.ts`
Expected: PASS

- [ ] **Step 5: Rodar tudo e conferir no celular**

Run: `npm run test:unit && npm run test:int && npm run typecheck && npm run lint && npm run test:e2e`
Expected: tudo PASS.

Depois, com um script Playwright temporário (não commitado) em 375×800 em `/`, confirme que:
- a página não tem rolagem horizontal (`document.documentElement.scrollWidth <= 375`);
- as fileiras rolam para o lado;
- o título do destaque cabe na tela.

Registre o resultado no relatório.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): vitrine com destaque e fileiras por streaming e gênero

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Busca por título

**Files:**
- Create: `supabase/migrations/20260923000400_search_titles.sql`, `src/lib/queries/searchTitles.ts`, `src/lib/queries/searchTitles.int.test.ts`, `src/app/busca/page.tsx`, `e2e/search.spec.ts`
- Modify: `src/lib/filters.ts`, `src/lib/filters.test.ts`, `src/app/actions.ts`, `src/components/catalog/MovieGrid.tsx`, `src/lib/supabase/database.types.ts` (gerado)

**Interfaces:**
- Consumes: `toSearchResult`, `SearchRow`, `PAGE_SIZE` (Task 3); `parseOffset`, `formatMovieCount`, `MovieGrid`, `createServerSupabase`.
- Produces:
  - função SQL `public.search_titles(p_query text, p_limit int default 24, p_offset int default 0)`;
  - `searchTitles(db: Db, query: string, offset: number): Promise<SearchResult>`;
  - `parseSearchQuery(value: string | string[] | undefined): string | null`;
  - Server Action `loadMoreSearch(query: string, offset: number): Promise<MovieCardData[]>`;
  - `MovieGrid` com a prop `kind?: 'catalog' | 'search'` (padrão `'catalog'`).

- [ ] **Step 1: Escrever os testes que falham**

Em `src/lib/filters.test.ts` (importe `parseSearchQuery`):

```ts
describe('parseSearchQuery', () => {
  it('remove espaços nas pontas', () => {
    expect(parseSearchQuery('  corra  ')).toBe('corra');
  });
  it('menos de 2 caracteres, vazio ou ausente é sem busca', () => {
    expect(parseSearchQuery('a')).toBeNull();
    expect(parseSearchQuery('   ')).toBeNull();
    expect(parseSearchQuery(undefined)).toBeNull();
  });
  it('usa só o primeiro valor quando repetido', () => {
    expect(parseSearchQuery(['nós', 'x'])).toBe('nós');
  });
  it('corta em 100 caracteres', () => {
    expect(parseSearchQuery('x'.repeat(500))).toHaveLength(100);
  });
});
```

`src/lib/queries/searchTitles.int.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { searchTitles } from './searchTitles';

const db = anonDb();
const ids = async (q: string) => (await searchTitles(db, q, 0)).movies.map((m) => m.id);

describe('searchTitles', () => {
  it('encontra pelo título em português, sem diferenciar maiúsculas', async () => {
    expect(await ids('cidade de')).toEqual([3]);
    expect(await ids('CORRA')).toEqual([1]);
  });

  it('ignora acentos', async () => {
    expect(await ids('hereditario')).toEqual([2]);
  });

  it('encontra pelo título original', async () => {
    expect(await ids('get out')).toEqual([1]);
  });

  it('não traz filme fora de qualquer streaming', async () => {
    expect(await ids('sem streaming')).toEqual([]);
  });

  it('curingas do LIKE são texto literal', async () => {
    expect(await ids('%')).toEqual([]);
    expect(await ids('%%')).toEqual([]);
    expect(await ids('__')).toEqual([]);
    expect(await ids('\\')).toEqual([]);
  });

  it('pagina e informa o total, ordenado por popularidade', async () => {
    const first = await searchTitles(db, 'filme extra', 0);
    expect(first.total).toBe(30);
    expect(first.movies).toHaveLength(24);
    expect(first.movies[0].id).toBe(101);
    const second = await searchTitles(db, 'filme extra', 24);
    expect(second.movies).toHaveLength(6);
  });

  it('p_limit enorme é limitado', async () => {
    const { data, error } = await db.rpc('search_titles', { p_query: 'filme extra', p_limit: 1000 });
    expect(error).toBeNull();
    expect(data).toHaveLength(30);
  });

  it('termo curto não traz nada', async () => {
    expect(await ids('a')).toEqual([]);
  });
});
```

(O teto de 100 também vale para `search_titles` pela mesma expressão `least(greatest(p_limit, 0), 100)` usada em `search_movies`. Os dados de exemplo só têm 30 "Filme Extra", então o teste acima garante que um limite enorme não quebra nada.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit src/lib/filters.test.ts` e `npx vitest run --project integration src/lib/queries/searchTitles.int.test.ts`
Expected: FAIL (`parseSearchQuery` e `searchTitles` não existem).

- [ ] **Step 3: Criar a migração** `supabase/migrations/20260923000400_search_titles.sql`

```sql
-- Busca por título (spec 2026-09-23-vitrine-netflix-design.md, seção 5).
-- unaccent + pg_trgm: ignora acentos e acha trechos rápido com um índice GIN.

create extension if not exists unaccent with schema extensions;
create extension if not exists pg_trgm with schema extensions;

-- unaccent() não é immutable (depende do dicionário); este invólucro fixa o dicionário
-- e pode ser usado em índice.
create or replace function public.f_unaccent(text)
returns text
language sql
immutable
parallel safe
strict
as $$
  select extensions.unaccent('extensions.unaccent'::regdictionary, $1)
$$;

create index if not exists movies_title_search_idx
  on public.movies
  using gin (public.f_unaccent(lower(title || ' ' || original_title)) extensions.gin_trgm_ops);

create or replace function public.search_titles(
  p_query text,
  p_limit integer default 24,
  p_offset integer default 0
)
returns table (
  id integer,
  title text,
  release_date date,
  runtime integer,
  vote_average numeric,
  poster_path text,
  providers jsonb,
  total_count bigint
)
language plpgsql
stable
security invoker
set search_path = public, extensions
set plan_cache_mode = force_custom_plan
as $$
declare
  v_term text;
  v_pattern text;
begin
  v_term := btrim(left(coalesce(p_query, ''), 100));
  if length(v_term) < 2 then
    return;
  end if;
  -- Escapa os curingas do LIKE (\ primeiro) para o termo ser sempre texto literal.
  v_pattern := '%' || replace(replace(replace(public.f_unaccent(lower(v_term)), '\', '\\'), '%', '\%'), '_', '\_') || '%';

  return query
  with filtered as (
    select m.id, m.title, m.release_date, m.runtime, m.vote_average, m.poster_path, m.popularity
    from movies m
    where public.f_unaccent(lower(m.title || ' ' || m.original_title)) like v_pattern
      and exists (select 1 from movie_providers mp where mp.movie_id = m.id)
  ),
  page as (
    select f.*, count(*) over () as total
    from filtered f
    order by f.popularity desc, f.id
    limit least(greatest(p_limit, 0), 100)
    offset greatest(p_offset, 0)
  )
  select
    pg.id,
    pg.title,
    pg.release_date,
    pg.runtime,
    pg.vote_average,
    pg.poster_path,
    (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'logo_path', p.logo_path)
                  order by p.display_priority, p.id),
        '[]'::jsonb)
      from providers p
      where exists (select 1 from movie_providers mp where mp.movie_id = pg.id and mp.provider_id = p.id)
    ),
    pg.total
  from page pg
  order by pg.popularity desc, pg.id;
end;
$$;

grant execute on function public.search_titles(text, integer, integer) to anon, authenticated;
```

Aplique e regere os tipos:

```bash
npx supabase db reset
npm run db:types
```

Expected: `database.types.ts` passa a ter `search_titles` e `f_unaccent`. Se o `db reset` reclamar de referência ambígua de coluna (`id`, `title`…), qualifique a coluna com o alias da tabela ou CTE. Não renomeie as colunas de saída.

- [ ] **Step 4: Implementar o código do site**

Acrescente ao fim de `src/lib/filters.ts`:

```ts
/** Termo de busca: sem espaços nas pontas, até 100 caracteres, mínimo 2. */
export function parseSearchQuery(value: string | string[] | undefined): string | null {
  const first = Array.isArray(value) ? value[0] : value;
  if (typeof first !== 'string') return null;
  const term = first.trim().slice(0, 100).trim();
  return term.length >= 2 ? term : null;
}
```

`src/lib/queries/searchTitles.ts`:

```ts
import { PAGE_SIZE, toSearchResult } from './searchMovies';
import type { Db, SearchResult } from './types';

export async function searchTitles(db: Db, query: string, offset: number): Promise<SearchResult> {
  const { data, error } = await db.rpc('search_titles', { p_query: query, p_limit: PAGE_SIZE, p_offset: offset });
  if (error) throw new Error(`search_titles: ${error.message}`);
  return toSearchResult(data ?? []);
}
```

`src/app/actions.ts`: acrescente os imports `parseSearchQuery` (de `@/lib/filters`) e `searchTitles` (de `@/lib/queries/searchTitles`), e a action:

```ts
export async function loadMoreSearch(query: string, offset: number): Promise<MovieCardData[]> {
  const term = parseSearchQuery(typeof query === 'string' ? query : undefined);
  if (!term) return [];
  const { movies } = await searchTitles(createServerSupabase(), term, parseOffset(offset));
  return movies;
}
```

`src/components/catalog/MovieGrid.tsx`:
- importe `loadMoreSearch` junto de `loadMoreMovies`;
- acrescente em `Props` a prop `kind?: 'catalog' | 'search';` e desestruture-a com padrão `kind = 'catalog'`;
- a busca não usa o estado de sessão do catálogo. Faça estas trocas:

```tsx
  const isCatalog = kind === 'catalog';

  useEffect(() => {
    if (isCatalog) saveQuery(query);
  }, [isCatalog, query]);
```

No efeito de restauração, a primeira linha passa a ser `if (!isCatalog || !takeReturnFromFilm()) return;`, e `isCatalog` entra nas dependências.

No `loadMore`:

```tsx
        const next = isCatalog ? await loadMoreMovies(query, movies.length) : await loadMoreSearch(query, movies.length);
```

e troque `saveCatalogState({ query, movies: merged, scrollY: window.scrollY });` por `if (isCatalog) saveCatalogState({ query, movies: merged, scrollY: window.scrollY });`.

Em `rememberPosition`, a primeira linha passa a ser `if (!isCatalog) return;`.

`src/app/busca/page.tsx`:

```tsx
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
          <Link href="/catalogo" className="mt-3 inline-block text-accent underline">
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
```

- [ ] **Step 5: Escrever o teste e2e** `e2e/search.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('busca pelo topo leva aos resultados', async ({ page }) => {
  await page.goto('/sobre');
  const box = page.getByRole('banner').getByRole('searchbox', { name: 'Buscar filme' });
  await box.fill('corra');
  await box.press('Enter');
  await expect(page).toHaveURL('/busca?q=corra');
  await expect(page.getByRole('heading', { level: 1, name: 'Resultados para “corra”' })).toBeVisible();
  await expect(page.getByTestId('movie-card')).toHaveCount(1);
  await expect(box).toHaveValue('corra');
});

test('busca sem acento acha o título acentuado', async ({ page }) => {
  await page.goto('/busca?q=hereditario');
  await expect(page.getByTestId('movie-card')).toContainText('Hereditário');
});

test('resultados longos usam Carregar mais', async ({ page }) => {
  await page.goto('/busca?q=filme%20extra');
  await expect(page.getByText('30 filmes')).toBeVisible();
  const cards = page.getByTestId('movie-card');
  await expect(cards).toHaveCount(24);
  await page.getByRole('button', { name: 'Carregar mais' }).click();
  await expect(cards).toHaveCount(30);
});

test('nenhum resultado e termo curto mostram mensagens', async ({ page }) => {
  await page.goto('/busca?q=xyzxyz');
  await expect(page.getByText('Nenhum filme encontrado para “xyzxyz”.')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver o catálogo' })).toHaveAttribute('href', '/catalogo');
  await page.goto('/busca?q=%20a%20');
  await expect(page.getByText('Digite pelo menos 2 letras para buscar.')).toBeVisible();
  await page.goto('/busca?q=%25');
  await expect(page.getByText('Digite pelo menos 2 letras para buscar.')).toBeVisible();
  await page.goto('/busca?q=%25%25');
  await expect(page.getByText('Nenhum filme encontrado para “%%”.')).toBeVisible();
});
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm run test:unit && npm run test:int && npm run typecheck && npm run lint && npm run test:e2e`
Expected: tudo PASS.

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: busca por título sem acentos com página de resultados

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Página do filme no layout novo

**Files:**
- Create: `src/components/movie/MovieDetailsView.tsx`, `src/components/movie/TrailerEmbed.tsx`
- Modify: `src/components/movie/WhereToWatch.tsx`, `src/components/movie/BackLink.tsx`, `src/app/filme/[id]/page.tsx`, `e2e/movie.spec.ts`
- Delete: `src/components/movie/MovieHero.tsx`

**Interfaces:**
- Consumes: `MovieDetails`, `ACCESS_TYPES`, `ACCESS_LABELS`, `ProviderLogo`, formatação, `tmdbImage`; `filmOpenedFromSite`, `clearFilmOpenedFromSite` (Task 4); `filmOpenedFromCatalog` (de `src/components/catalog/catalogSession.ts`).
- Produces:
  - `<MovieDetailsView movie>`;
  - `<TrailerEmbed trailerKey title>`, com o botão de nome acessível "Reproduzir trailer de <título>";
  - `WhereToWatch` com grupos `data-testid="watch-<tipo>"` e chips com o nome do streaming;
  - o link "Voltar" (nome acessível exato "Voltar").

- [ ] **Step 1: Reescrever os testes da página do filme** — em `e2e/movie.spec.ts`, substitua os testes `'mostra detalhes, onde assistir e trailer'`, `'filme sem trailer não mostra o botão'` e `'voltar ao catálogo mantém os filtros'` por:

```ts
test('mostra detalhes, onde assistir e trailer embutido', async ({ page }) => {
  await page.goto('/filme/1');
  await expect(page.getByRole('heading', { level: 1, name: 'Corra!' })).toBeVisible();
  const info = page.getByRole('list', { name: 'Informações' });
  await expect(info.getByRole('listitem')).toHaveText(['★ 7,6', '2017', '1h44']);
  await expect(page.getByRole('list', { name: 'Gêneros' }).getByRole('listitem')).toHaveText(['Terror', 'Thriller']);
  await expect(page.getByRole('heading', { level: 2, name: 'Onde assistir' })).toBeVisible();
  await expect(page.getByTestId('watch-flatrate')).toContainText('Netflix');
  await expect(page.getByTestId('watch-rent')).toContainText('Amazon Prime Video');
  await expect(page.getByTestId('watch-buy')).toContainText('Amazon Prime Video');
  await expect(page.getByText('Dados de disponibilidade:')).toBeVisible();
  await expect(page).toHaveTitle(/Corra! \(2017\)/);

  await expect(page.locator('iframe')).toHaveCount(0);
  await page.getByRole('button', { name: 'Reproduzir trailer de Corra!' }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/sRfnevzM9kQ"]')).toBeAttached();
});

test('filme sem trailer não mostra a seção de trailer', async ({ page }) => {
  await page.goto('/filme/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Hereditário' })).toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Trailer' })).toHaveCount(0);
});

test('voltar ao catálogo mantém os filtros', async ({ page }) => {
  await page.goto('/catalogo?streaming=8');
  await page.getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL('/catalogo?streaming=8');
});

test('voltar leva de volta à vitrine quando o filme foi aberto por ela', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('region', { name: 'Terror' }).getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL('/');
});

test('filme aberto por link de fora: voltar vai para a vitrine sem sair do site', async ({ page }) => {
  await page.goto('/filme/1');
  await page.getByRole('link', { name: 'Voltar', exact: true }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { level: 2, name: 'Em alta agora' })).toBeVisible();
});

test('no celular o pôster fica acima das informações', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto('/filme/1');
  const poster = await page.getByTestId('movie-poster').boundingBox();
  const title = await page.getByRole('heading', { level: 1 }).boundingBox();
  expect(poster && title && poster.y + poster.height <= title.y).toBe(true);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(375);
});
```

Nos testes `'link voltar mantém os blocos carregados e a rolagem'` (e em qualquer outro que use o link antigo), troque `getByRole('link', { name: '← Voltar ao catálogo' })` por `getByRole('link', { name: 'Voltar', exact: true })`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx playwright test e2e/movie.spec.ts`
Expected: FAIL (layout antigo: sem listas "Informações"/"Gêneros", sem "Reproduzir trailer", link "← Voltar ao catálogo").

- [ ] **Step 3: Implementar**

`src/components/movie/BackLink.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { filmOpenedFromCatalog } from '@/components/catalog/catalogSession';
import { clearFilmOpenedFromSite, filmOpenedFromSite } from '@/lib/navigation-origin';

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/"
      onClick={(e) => {
        // Aberto por um link de dentro do site nesta aba: volta pelo histórico (vitrine, catálogo
        // com filtros e rolagem, ou busca). Aberto de fora: vai para a vitrine.
        const path = window.location.pathname;
        if (filmOpenedFromSite(path) || filmOpenedFromCatalog(path)) {
          e.preventDefault();
          clearFilmOpenedFromSite();
          router.back();
        }
      }}
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
    >
      <span aria-hidden="true">‹</span> Voltar
    </Link>
  );
}
```

`src/components/movie/TrailerEmbed.tsx`:

```tsx
'use client';

import Image from 'next/image';
import { useState } from 'react';

// Mostra a miniatura do YouTube e só carrega o player quando a pessoa pede.
export function TrailerEmbed({ trailerKey, title }: { trailerKey: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const key = encodeURIComponent(trailerKey);

  return (
    <section aria-labelledby="trailer" className="mt-10">
      <h2
        id="trailer"
        className="flex items-center gap-2.5 font-display text-lg font-bold before:h-5 before:w-1 before:rounded-full before:bg-accent"
      >
        Trailer
      </h2>
      <div className="relative mt-4 aspect-video max-w-3xl overflow-hidden rounded-lg border border-border bg-black">
        {playing ? (
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${key}?autoplay=1`}
            title={`Trailer de ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            aria-label={`Reproduzir trailer de ${title}`}
            onClick={() => setPlaying(true)}
            className="group absolute inset-0"
          >
            <Image
              src={`https://i.ytimg.com/vi/${key}/hqdefault.jpg`}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover opacity-75 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-2 rounded-full bg-black/75 px-5 py-3 font-semibold">
                <span aria-hidden="true">▶</span> Reproduzir trailer
              </span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
```

`src/components/movie/WhereToWatch.tsx`:

```tsx
import { ProviderLogo } from '@/components/ProviderLogo';
import { ACCESS_LABELS, ACCESS_TYPES } from '@/lib/filters';
import type { MovieDetails } from '@/lib/queries/types';

export function WhereToWatch({ watch }: { watch: MovieDetails['watch'] }) {
  return (
    <section aria-labelledby="onde-assistir" className="mt-8">
      <h2
        id="onde-assistir"
        className="flex items-center gap-2.5 font-display text-lg font-bold before:h-5 before:w-1 before:rounded-full before:bg-accent"
      >
        Onde assistir
      </h2>
      <dl className="mt-4 space-y-3">
        {ACCESS_TYPES.filter((type) => watch[type].length > 0).map((type) => (
          <div key={type} data-testid={`watch-${type}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-24 shrink-0 text-sm text-muted">{ACCESS_LABELS[type]}</dt>
            <dd className="flex flex-wrap gap-2">
              {watch[type].map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pl-1.5 pr-3 text-sm"
                >
                  <ProviderLogo provider={p} size={28} />
                  {p.name}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        Dados de disponibilidade:{' '}
        <a href="https://www.justwatch.com/br" className="underline" target="_blank" rel="noreferrer">
          JustWatch
        </a>
      </p>
    </section>
  );
}
```

`src/components/movie/MovieDetailsView.tsx`:

```tsx
import Image from 'next/image';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import type { MovieDetails } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';
import { BackLink } from './BackLink';
import { TrailerEmbed } from './TrailerEmbed';
import { WhereToWatch } from './WhereToWatch';

export function MovieDetailsView({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const poster = tmdbImage(movie.posterPath, 'w500');
  const facts = [formatYear(movie.releaseDate), formatRuntime(movie.runtime)].filter((v): v is string => Boolean(v));

  return (
    <article className="relative isolate">
      {backdrop && (
        <div aria-hidden="true" className="absolute inset-x-0 top-0 -z-10 h-[420px] overflow-hidden">
          <Image src={backdrop} alt="" fill sizes="100vw" className="scale-110 object-cover opacity-30 blur-md" />
          <div className="absolute inset-0 bg-linear-to-b from-bg/40 via-bg/80 to-bg" />
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pb-12 pt-6 sm:px-8">
        <BackLink />
        <div className="mt-6 grid gap-8 sm:grid-cols-[240px_minmax(0,1fr)]">
          <div
            data-testid="movie-poster"
            className="relative mx-auto aspect-[2/3] w-40 overflow-hidden rounded-lg bg-surface shadow-2xl sm:mx-0 sm:w-full"
          >
            {poster && <Image src={poster} alt={`Pôster de ${movie.title}`} fill sizes="240px" className="object-cover" />}
          </div>
          <div className="min-w-0">
            <h1 className="font-display text-3xl font-extrabold leading-tight tracking-tight sm:text-[44px]">
              {movie.title}
            </h1>
            <ul aria-label="Informações" className="mt-4 flex flex-wrap gap-2 text-sm">
              <li className="rounded-md bg-surface px-2.5 py-1">
                <span className="text-star">★</span> {formatRating(movie.voteAverage)}
              </li>
              {facts.map((fact) => (
                <li key={fact} className="rounded-md bg-surface px-2.5 py-1">
                  {fact}
                </li>
              ))}
            </ul>
            {movie.genres.length > 0 && (
              <ul aria-label="Gêneros" className="mt-3 flex flex-wrap gap-2 text-xs">
                {movie.genres.map((genre) => (
                  <li key={genre} className="rounded-full border border-border px-3 py-1 text-fg/80">
                    {genre}
                  </li>
                ))}
              </ul>
            )}
            {movie.overview && <p className="mt-5 max-w-prose leading-relaxed text-fg/90">{movie.overview}</p>}
            <WhereToWatch watch={movie.watch} />
            {movie.trailerKey && <TrailerEmbed trailerKey={movie.trailerKey} title={movie.title} />}
          </div>
        </div>
      </div>
    </article>
  );
}
```

`src/app/filme/[id]/page.tsx`:
- troque os imports de `MovieHero` e `WhereToWatch` por `import { MovieDetailsView } from '@/components/movie/MovieDetailsView';`;
- o retorno do componente passa a ser:

```tsx
  return (
    <main>
      <MovieDetailsView movie={movie} />
    </main>
  );
```

Remova o componente antigo:

```bash
git rm src/components/movie/MovieHero.tsx
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx playwright test e2e/movie.spec.ts`
Expected: PASS

- [ ] **Step 5: Rodar tudo**

Run: `npm run test:unit && npm run test:int && npm run typecheck && npm run lint && npm run test:e2e`
Expected: tudo PASS.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): página do filme no layout novo com trailer embutido

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
