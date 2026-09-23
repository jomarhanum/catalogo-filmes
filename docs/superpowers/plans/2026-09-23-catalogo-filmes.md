# Catálogo de Filmes (Fase 1) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Site Next.js que mostra os filmes disponíveis agora nos streamings do Brasil, com filtros combinados e página de filme, alimentado por um catálogo sincronizado diariamente do TMDB para o Supabase.

**Architecture:** Três partes: (1) um sincronizador TypeScript em `sync/`, rodado pelo GitHub Actions uma vez por dia, que lê o TMDB e grava no Supabase com a chave de serviço; (2) um banco Supabase Postgres com RLS só de leitura para a chave pública e uma função SQL `search_movies` para os filtros; (3) um site Next.js (App Router) na Vercel, que só lê o banco. As páginas são montadas no servidor, os filtros ficam na URL e o botão "Carregar mais" usa uma Server Action.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, @supabase/supabase-js 2, Supabase CLI (Postgres local via Docker), Zod 4, Vitest 5, Playwright 1.6x, tsx, GitHub Actions, Vercel.

**Spec:** `docs/superpowers/specs/2026-09-23-catalogo-filmes-design.md`

## Global Constraints

- Região fixa: `watch_region=BR`; textos do TMDB pedidos com `language=pt-BR`.
- Tipos de acesso: exatamente `flatrate` (Assinatura), `rent` (Aluguel), `buy` (Compra).
- Parâmetros de URL do catálogo, com estes nomes exatos: `streaming`, `acesso`, `genero`, `ano_min`, `ano_max`, `nota`, `duracao_max`, `idioma`, `ordem` (`populares` | `nota` | `recentes` | `az`, padrão `populares`).
- Listas na URL separadas por vírgula; dentro de cada filtro e entre streamings/tipos, a regra é "qualquer um" (OR).
- Ordem `nota` só considera filmes com `vote_count >= 50`.
- Página do catálogo: 24 filmes por bloco (`PAGE_SIZE = 24`).
- O site nunca chama o TMDB; imagens vêm de `https://image.tmdb.org/t/p/<tamanho><path>` com `images.unoptimized: true`.
- Nenhuma chave secreta no navegador: o site usa só `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY`; o sincronizador usa `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` e `TMDB_API_TOKEN`.
- Sincronizador: no máximo cerca de 20 req/s ao TMDB; novas tentativas em 429/5xx com esperas de 1s, 2s e 4s; limpeza de ligações **só** se todos os passos anteriores terminarem sem erro; detalhes renovados após 30 dias.
- Créditos obrigatórios: "This product uses the TMDB API but is not endorsed or certified by TMDB" em `/sobre`, e "Dados de disponibilidade: JustWatch" junto de "onde assistir".
- Textos da interface em português do Brasil; identificadores de código em inglês.
- Node.js 24 (LTS); Docker Desktop precisa estar rodando para o Supabase local.

## Review Focus

- `ano_min` maior que `ano_max` na URL (ex.: `?ano_min=2020&ano_max=2000`) → os valores são trocados em vez de retornar zero filmes. Teste na Task 3.
- Parâmetros repetidos ou parcialmente inválidos (ex.: `?streaming=8&streaming=abc,119`) → valem os valores válidos de todas as ocorrências (`[8, 119]`). Teste na Task 3.
- `/movie/{id}` do TMDB respondendo 404 (filme removido de lá) → o sincronizador pula o filme, termina e ainda faz a limpeza. Teste na Task 8.
- Mesmo filme duas vezes numa página do `/discover` ou em vários streamings → um upsert sem linhas repetidas (o Postgres rejeita linha repetida no mesmo `ON CONFLICT`). Teste na Task 8, com o repositório em memória recusando repetição como o Postgres.
- Server Action "Carregar mais" chamada com argumentos adulterados (offset `-5`, `"abc"`, `1e9`) → o offset é limitado a um valor seguro e a query é revalidada, sem erro de banco. Teste na Task 3 (`parseOffset`).

---

## Mapa de arquivos

```
.env.example                              nomes das variáveis
.github/workflows/ci.yml                  CI: tipos, lint, unit, integração, e2e
.github/workflows/sync.yml                sincronização diária
next.config.ts                            images.unoptimized
playwright.config.ts
vitest.config.ts                          projetos "unit" e "integration"
scripts/write-local-env.mjs               gera .env.local a partir do Supabase local
supabase/config.toml                      (gerado pelo supabase init)
supabase/migrations/20260923000000_schema.sql
supabase/migrations/20260923000100_search.sql
supabase/seed.sql                         dados de exemplo usados pelos testes
tests/support/load-env.ts                 carrega .env.local nos testes de integração
tests/support/db.ts                       clientes anon/service para testes
src/lib/format.ts (+ .test.ts)            ano, duração, nota
src/lib/tmdb-image.ts (+ .test.ts)        URL de imagens do TMDB
src/lib/filters.ts (+ .test.ts)           parse/serialização de filtros, parseOffset, parseMovieId
src/lib/supabase/database.types.ts        gerado por `supabase gen types`
src/lib/supabase/server.ts                cliente Supabase do servidor (anon)
src/lib/queries/types.ts                  tipos de retorno das consultas
src/lib/queries/searchMovies.ts (+ .int.test.ts)
src/lib/queries/lists.ts (+ .int.test.ts) listProviders, listGenres
src/lib/queries/getMovie.ts (+ .int.test.ts)
src/lib/queries/rls.int.test.ts
src/app/layout.tsx, globals.css, not-found.tsx, error.tsx
src/app/page.tsx                          catálogo
src/app/actions.ts                        Server Action loadMoreMovies
src/app/sobre/page.tsx
src/app/filme/[id]/page.tsx, not-found.tsx
src/components/ProviderLogo.tsx
src/components/catalog/{MovieCard,MovieGrid,EmptyState,CatalogControls,ProviderPicker,AccessTypeChips,FiltersDrawer,SortSelect,useFilterNavigation}.tsx/ts
src/components/movie/{MovieHero,WhereToWatch,TrailerModal,BackLink}.tsx
sync/tmdb.ts (+ .test.ts)                 cliente TMDB com limite e novas tentativas
sync/trailer.ts (+ .test.ts)              escolha do trailer
sync/scan.ts (+ .test.ts)                 varredura do /discover com divisão por anos
sync/pool.ts (+ .test.ts)                 concorrência limitada
sync/repository.ts                        interface CatalogRepository e tipos de linha
sync/sync.ts (+ .test.ts)                 orquestração runSync
sync/testing/fake-tmdb.ts, memory-repository.ts
sync/supabase-repository.ts (+ .int.test.ts)
sync/main.ts                              ponto de entrada (npm run sync)
e2e/shell.spec.ts, catalog.spec.ts, filters.spec.ts, movie.spec.ts
```

---

### Task 0: Pré-requisitos (manual, feito por você)

Nenhum código. Cada item fica marcado quando estiver pronto.

- [ ] **Step 1: Docker Desktop.** Baixe em https://www.docker.com/products/docker-desktop/, instale com o backend WSL 2 (padrão), reinicie se ele pedir e abra o Docker Desktop. Confira:

Run: `docker --version && docker run --rm hello-world`
Expected: versão impressa e a mensagem "Hello from Docker!"

- [ ] **Step 2: Token do TMDB.** Em https://www.themoviedb.org/settings/api, copie o **"API Read Access Token"** (o token longo que começa com `eyJ`), não a "API Key" curta. Guarde-o; ele entra no `.env.local` na Task 2.

- [ ] **Step 3: Node 24.** Run: `node -v` → Expected: `v24.x`.

---

### Task 1: Esqueleto Next.js + Vitest + utilitários de formatação

**Files:**
- Create: projeto Next.js na raiz (via create-next-app), `vitest.config.ts`, `tests/support/load-env.ts`, `next.config.ts` (sobrescrever)
- Create: `src/lib/format.ts`, `src/lib/format.test.ts`, `src/lib/tmdb-image.ts`, `src/lib/tmdb-image.test.ts`

**Interfaces:**
- Produces: `formatYear(date: string | null): string | null`, `formatRuntime(minutes: number | null): string | null`, `formatRating(value: number): string`, `tmdbImage(path: string | null, size: TmdbImageSize): string | null`, `type TmdbImageSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280'`. Scripts npm: `test:unit`, `test:int`, `typecheck`.

- [ ] **Step 1: Gerar o projeto numa pasta temporária** (a raiz já tem `docs/` e `.superpowers/`, que o create-next-app recusa)

```bash
npx create-next-app@latest _scaffold --ts --tailwind --eslint --app --src-dir --import-alias "@/*" --use-npm --disable-git --yes
```

- [ ] **Step 2: Mover para a raiz, juntando o `.gitignore`**

```bash
cat _scaffold/.gitignore >> .gitignore
rm _scaffold/.gitignore
cp -r _scaffold/. .
rm -rf _scaffold
npm install
```

Confira que o `.gitignore` ainda contém `.superpowers/` e `.env*.local`.

- [ ] **Step 3: Dependências de teste e scripts**

```bash
npm install zod @supabase/supabase-js server-only
npm install -D vitest tsx supabase @playwright/test
npm pkg set scripts.typecheck="tsc --noEmit"
npm pkg set scripts.test:unit="vitest run --project unit"
npm pkg set scripts.test:int="vitest run --project integration"
npm pkg set scripts.test:e2e="playwright test"
```

- [ ] **Step 4: Criar `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: 'unit',
          include: ['src/**/*.test.ts', 'sync/**/*.test.ts'],
          exclude: ['**/*.int.test.ts', '**/node_modules/**'],
        },
      },
      {
        extends: true,
        test: {
          name: 'integration',
          include: ['src/**/*.int.test.ts', 'sync/**/*.int.test.ts'],
          setupFiles: ['tests/support/load-env.ts'],
          fileParallelism: false,
        },
      },
    ],
  },
});
```

- [ ] **Step 5: Criar `tests/support/load-env.ts`**

```ts
// Carrega .env.local (gerado por scripts/write-local-env.mjs) nos testes de integração.
try {
  process.loadEnvFile('.env.local');
} catch {
  // No CI o arquivo também é gerado; se faltar, os testes falham com mensagem clara em tests/support/db.ts.
}
```

- [ ] **Step 6: Sobrescrever `next.config.ts`**

```ts
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Imagens vêm prontas do CDN do TMDB; não gastamos a cota de otimização da Vercel.
  images: { unoptimized: true },
};

export default nextConfig;
```

- [ ] **Step 7: Escrever os testes que falham** — `src/lib/format.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { formatRating, formatRuntime, formatYear } from './format';

describe('formatYear', () => {
  it('extrai o ano de uma data ISO', () => expect(formatYear('2017-02-24')).toBe('2017'));
  it('retorna null sem data', () => {
    expect(formatYear(null)).toBeNull();
    expect(formatYear('')).toBeNull();
  });
});

describe('formatRuntime', () => {
  it('horas e minutos com dois dígitos', () => expect(formatRuntime(104)).toBe('1h44'));
  it('minutos com zero à esquerda', () => expect(formatRuntime(65)).toBe('1h05'));
  it('horas exatas', () => expect(formatRuntime(120)).toBe('2h'));
  it('menos de uma hora', () => expect(formatRuntime(45)).toBe('45min'));
  it('null para vazio ou zero', () => {
    expect(formatRuntime(null)).toBeNull();
    expect(formatRuntime(0)).toBeNull();
  });
});

describe('formatRating', () => {
  it('uma casa decimal', () => {
    expect(formatRating(7.6)).toBe('7.6');
    expect(formatRating(8)).toBe('8.0');
  });
});
```

`src/lib/tmdb-image.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tmdbImage } from './tmdb-image';

describe('tmdbImage', () => {
  it('monta a URL do CDN do TMDB', () => {
    expect(tmdbImage('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
  });
  it('retorna null sem caminho', () => {
    expect(tmdbImage(null, 'w92')).toBeNull();
    expect(tmdbImage('', 'w92')).toBeNull();
  });
});
```

- [ ] **Step 8: Rodar e ver falhar**

Run: `npm run test:unit`
Expected: FAIL, "Failed to resolve import ./format" (e o mesmo para ./tmdb-image)

- [ ] **Step 9: Implementar** — `src/lib/format.ts`

```ts
export function formatYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

export function formatRating(value: number): string {
  return value.toFixed(1);
}
```

`src/lib/tmdb-image.ts`:

```ts
export type TmdbImageSize = 'w92' | 'w185' | 'w342' | 'w500' | 'w780' | 'w1280';

export function tmdbImage(path: string | null, size: TmdbImageSize): string | null {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : null;
}
```

- [ ] **Step 10: Rodar e ver passar**

Run: `npm run test:unit && npm run typecheck && npm run lint`
Expected: todos os testes PASS; typecheck e lint sem erros

- [ ] **Step 11: Commit**

```bash
git add -A
git commit -m "chore: esqueleto Next.js com Vitest e utilitários de formatação"
```

---

### Task 2: Supabase local — schema, RLS, dados de exemplo e tipos

**Files:**
- Create: `supabase/` (via `supabase init`), `supabase/migrations/20260923000000_schema.sql`, `supabase/seed.sql`
- Create: `scripts/write-local-env.mjs`, `.env.example`, `tests/support/db.ts`, `src/lib/queries/rls.int.test.ts`
- Create (gerado): `src/lib/supabase/database.types.ts`

**Interfaces:**
- Produces: tabelas `providers`, `genres`, `movies`, `movie_genres`, `movie_providers`, enum `access_type`; `anonDb()` e `serviceDb()` em `tests/support/db.ts` (retornam `SupabaseClient<Database>`); tipo `Database` em `@/lib/supabase/database.types`. Scripts npm `env:local` e `db:types`.
- Dados de exemplo (usados por todos os testes de integração e e2e, **não altere sem atualizar os testes**):

| id | título | lançamento | min | nota | votos | pop. | idioma | gêneros | streamings |
|---|---|---|---|---|---|---|---|---|---|
| 1 | Corra! | 2017-02-24 | 104 | 7.6 | 17000 | 50 | en | 27, 53 | 8 flatrate; 119 rent; 119 buy |
| 2 | Hereditário | 2018-06-07 | 127 | 7.3 | 8000 | 40 | en | 27, 18 | 1899 flatrate |
| 3 | Cidade de Deus | 2002-08-30 | 130 | 8.4 | 7000 | 30 | pt | 18 | 8 flatrate; 119 buy |
| 4 | Nós | 2019-03-21 | 116 | 7.0 | 9000 | 35 | en | 27, 53 | 337 flatrate |
| 5 | Bacurau | 2019-08-29 | 132 | 7.2 | 900 | 10 | pt | 18, 53 | 119 rent |
| 6 | Filme Obscuro | 2020-01-01 | 90 | 9.5 | 3 | 1 | en | 18 | 8 flatrate |
| 7 | Mad Max: Estrada da Fúria | 2015-05-14 | 120 | 7.6 | 22000 | 60 | en | 28 | 1899 flatrate; 119 buy |
| 8 | Sem Data | — | — | 6.0 | 100 | 5 | en | 28 | 337 rent |
| 9 | Sem Streaming | 2010-01-01 | 100 | 8.0 | 1000 | 99 | en | 18 | nenhum |
| 101–130 | Filme Extra 01–30 | 1990-01-01 | 200 | 5.0 | 100 | 0.49→0.20 | fr | 99 | 1899 rent |

Streamings: 8 Netflix (prioridade 1), 119 Amazon Prime Video (2), 337 Disney Plus (3), 1899 Max (4), 350 Apple TV Plus (5, sem filmes). Gêneros: 18 Drama, 27 Terror, 28 Ação, 53 Thriller, 99 Documentário. Total visível no catálogo: 38 filmes.

- [ ] **Step 1: Inicializar e subir o Supabase local** (o Docker Desktop precisa estar aberto)

```bash
npx supabase init
```
Responda "N" às perguntas sobre configurações de VS Code/IntelliJ/Deno.

```bash
npx supabase start
```
Expected: no fim, uma lista com `API URL: http://127.0.0.1:54321`. A primeira vez baixa as imagens e demora alguns minutos.

- [ ] **Step 2: Criar `scripts/write-local-env.mjs`**

```js
// Gera .env.local com as chaves do Supabase local, preservando TMDB_API_TOKEN se já existir.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const kept = existsSync('.env.local')
  ? readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((line) => line.startsWith('TMDB_API_TOKEN='))
  : [];

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  `SUPABASE_URL=${status.API_URL}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  ...kept,
];
writeFileSync('.env.local', lines.join('\n') + '\n');
console.log('.env.local atualizado');
```

```bash
npm pkg set scripts.env:local="node scripts/write-local-env.mjs"
npm pkg set scripts.db:types="supabase gen types typescript --local > src/lib/supabase/database.types.ts"
npm run env:local
```
Depois abra `.env.local` e acrescente uma linha `TMDB_API_TOKEN=<seu token da Task 0>`.

- [ ] **Step 3: Criar `.env.example`**

```
# Site (Vercel) — só leitura, protegida por RLS
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
# Sincronizador (GitHub Secrets) — nunca exponha no navegador
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
TMDB_API_TOKEN=
```

- [ ] **Step 4: Criar `tests/support/db.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definida. Rode "npx supabase start" e "npm run env:local".`);
  return value;
}

export function anonDb() {
  return createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });
}

export function serviceDb() {
  return createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}
```

- [ ] **Step 5: Escrever o teste que falha** — `src/lib/queries/rls.int.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { anonDb, serviceDb } from '../../../tests/support/db';

describe('RLS', () => {
  it('a chave pública lê filmes', async () => {
    const { data, error } = await anonDb().from('movies').select('id').eq('id', 1);
    expect(error).toBeNull();
    expect(data).toEqual([{ id: 1 }]);
  });

  it('a chave pública não grava', async () => {
    const { error } = await anonDb().from('genres').insert({ id: 990000, name: 'Invasor' });
    expect(error).not.toBeNull();
  });

  it('a chave pública não apaga', async () => {
    await anonDb().from('movie_providers').delete().eq('movie_id', 1);
    const { count } = await serviceDb()
      .from('movie_providers')
      .select('*', { count: 'exact', head: true })
      .eq('movie_id', 1);
    expect(count).toBe(3);
  });
});
```

- [ ] **Step 6: Criar `supabase/migrations/20260923000000_schema.sql`**

```sql
create type public.access_type as enum ('flatrate', 'rent', 'buy');

create table public.providers (
  id integer primary key,
  name text not null,
  logo_path text,
  display_priority integer not null default 999
);

create table public.genres (
  id integer primary key,
  name text not null
);

create table public.movies (
  id integer primary key,
  title text not null,
  original_title text not null,
  overview text,
  release_date date,
  runtime integer,
  vote_average numeric(3,1) not null default 0,
  vote_count integer not null default 0,
  popularity numeric not null default 0,
  original_language text not null,
  poster_path text,
  backdrop_path text,
  trailer_key text,
  details_synced_at timestamptz
);

create table public.movie_genres (
  movie_id integer not null references public.movies (id) on delete cascade,
  genre_id integer not null references public.genres (id) on delete cascade,
  primary key (movie_id, genre_id)
);

create table public.movie_providers (
  movie_id integer not null references public.movies (id) on delete cascade,
  provider_id integer not null references public.providers (id) on delete cascade,
  access_type public.access_type not null,
  last_seen_at timestamptz not null default now(),
  primary key (movie_id, provider_id, access_type)
);

create index movie_providers_provider_access_idx on public.movie_providers (provider_id, access_type);
create index movies_popularity_idx on public.movies (popularity desc);
create index movies_vote_average_idx on public.movies (vote_average desc);
create index movies_release_date_idx on public.movies (release_date desc);
create index movie_genres_genre_idx on public.movie_genres (genre_id);

alter table public.providers enable row level security;
alter table public.genres enable row level security;
alter table public.movies enable row level security;
alter table public.movie_genres enable row level security;
alter table public.movie_providers enable row level security;

create policy "leitura pública" on public.providers for select to anon, authenticated using (true);
create policy "leitura pública" on public.genres for select to anon, authenticated using (true);
create policy "leitura pública" on public.movies for select to anon, authenticated using (true);
create policy "leitura pública" on public.movie_genres for select to anon, authenticated using (true);
create policy "leitura pública" on public.movie_providers for select to anon, authenticated using (true);

grant select on all tables in schema public to anon, authenticated;
```

- [ ] **Step 7: Criar `supabase/seed.sql`**

```sql
insert into public.providers (id, name, logo_path, display_priority) values
  (8, 'Netflix', null, 1),
  (119, 'Amazon Prime Video', null, 2),
  (337, 'Disney Plus', null, 3),
  (1899, 'Max', null, 4),
  (350, 'Apple TV Plus', null, 5);

insert into public.genres (id, name) values
  (18, 'Drama'), (27, 'Terror'), (28, 'Ação'), (53, 'Thriller'), (99, 'Documentário');

insert into public.movies
  (id, title, original_title, overview, release_date, runtime, vote_average, vote_count, popularity, original_language, trailer_key)
values
  (1, 'Corra!', 'Get Out', 'Um jovem visita a família da namorada e descobre segredos perturbadores.', '2017-02-24', 104, 7.6, 17000, 50, 'en', 'sRfnevzM9kQ'),
  (2, 'Hereditário', 'Hereditary', 'Uma família é assombrada após a morte da avó.', '2018-06-07', 127, 7.3, 8000, 40, 'en', null),
  (3, 'Cidade de Deus', 'Cidade de Deus', 'A vida em uma favela do Rio entre os anos 60 e 80.', '2002-08-30', 130, 8.4, 7000, 30, 'pt', null),
  (4, 'Nós', 'Us', 'Uma família encontra seus sósias.', '2019-03-21', 116, 7.0, 9000, 35, 'en', null),
  (5, 'Bacurau', 'Bacurau', 'Um povoado do sertão some do mapa.', '2019-08-29', 132, 7.2, 900, 10, 'pt', null),
  (6, 'Filme Obscuro', 'Obscure Film', null, '2020-01-01', 90, 9.5, 3, 1, 'en', null),
  (7, 'Mad Max: Estrada da Fúria', 'Mad Max: Fury Road', 'Uma fuga pelo deserto.', '2015-05-14', 120, 7.6, 22000, 60, 'en', null),
  (8, 'Sem Data', 'No Date', null, null, null, 6.0, 100, 5, 'en', null),
  (9, 'Sem Streaming', 'No Streaming', null, '2010-01-01', 100, 8.0, 1000, 99, 'en', null);

insert into public.movies (id, title, original_title, release_date, runtime, vote_average, vote_count, popularity, original_language)
select 100 + n,
       format('Filme Extra %s', lpad(n::text, 2, '0')),
       format('Extra Movie %s', lpad(n::text, 2, '0')),
       '1990-01-01', 200, 5.0, 100, 0.5 - n / 100.0, 'fr'
from generate_series(1, 30) as n;

insert into public.movie_genres (movie_id, genre_id) values
  (1, 27), (1, 53), (2, 27), (2, 18), (3, 18), (4, 27), (4, 53),
  (5, 18), (5, 53), (6, 18), (7, 28), (8, 28), (9, 18);
insert into public.movie_genres (movie_id, genre_id) select 100 + n, 99 from generate_series(1, 30) as n;

insert into public.movie_providers (movie_id, provider_id, access_type) values
  (1, 8, 'flatrate'), (1, 119, 'rent'), (1, 119, 'buy'),
  (2, 1899, 'flatrate'),
  (3, 8, 'flatrate'), (3, 119, 'buy'),
  (4, 337, 'flatrate'),
  (5, 119, 'rent'),
  (6, 8, 'flatrate'),
  (7, 1899, 'flatrate'), (7, 119, 'buy'),
  (8, 337, 'rent');
insert into public.movie_providers (movie_id, provider_id, access_type)
select 100 + n, 1899, 'rent' from generate_series(1, 30) as n;
```

- [ ] **Step 8: Aplicar e gerar os tipos**

```bash
npx supabase db reset
npm run db:types
```
Expected: `db reset` termina com "Finished supabase db reset"; `src/lib/supabase/database.types.ts` contém `movie_providers` e `access_type`.

- [ ] **Step 9: Rodar o teste**

Run: `npm run test:int`
Expected: 3 testes PASS

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat(db): schema com RLS, dados de exemplo e tipos gerados"
```

---

### Task 3: Filtros da URL

**Files:**
- Create: `src/lib/filters.ts`, `src/lib/filters.test.ts`

**Interfaces:**
- Produces:
  - `ACCESS_TYPES = ['flatrate','rent','buy'] as const`, `type AccessType`, `ACCESS_LABELS: Record<AccessType, string>`
  - `SORT_KEYS = ['populares','nota','recentes','az'] as const`, `type SortKey`, `SORT_LABELS: Record<SortKey, string>`
  - `interface CatalogFilters { providers: number[]; access: AccessType[]; genres: number[]; yearMin: number | null; yearMax: number | null; minRating: number | null; maxRuntime: number | null; language: string | null; sort: SortKey }`
  - `DEFAULT_FILTERS: CatalogFilters`
  - `type RawSearchParams = Record<string, string | string[] | undefined>`
  - `parseFilters(raw: RawSearchParams): CatalogFilters`
  - `filtersToQuery(f: CatalogFilters): string` (sem `?`, sem padrões; vírgulas literais)
  - `countExtraFilters(f: CatalogFilters): number` (gênero, ano, nota, duração e idioma; cada um conta 1)
  - `toggle<T>(list: T[], value: T): T[]`
  - `parseOffset(value: unknown): number` (inteiro entre 0 e 10000; qualquer outra coisa vira 0)
  - `parseMovieId(value: string): number | null`

- [ ] **Step 1: Escrever os testes que falham** — `src/lib/filters.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  countExtraFilters,
  filtersToQuery,
  parseFilters,
  parseMovieId,
  parseOffset,
  toggle,
} from './filters';

describe('parseFilters', () => {
  it('sem parâmetros retorna o padrão', () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it('lê todos os filtros', () => {
    expect(
      parseFilters({
        streaming: '8,119',
        acesso: 'flatrate,rent',
        genero: '27',
        ano_min: '2000',
        ano_max: '2020',
        nota: '7.5',
        duracao_max: '120',
        idioma: 'en',
        ordem: 'nota',
      }),
    ).toEqual({
      providers: [8, 119],
      access: ['flatrate', 'rent'],
      genres: [27],
      yearMin: 2000,
      yearMax: 2020,
      minRating: 7.5,
      maxRuntime: 120,
      language: 'en',
      sort: 'nota',
    });
  });

  it('ignora valores inválidos', () => {
    expect(
      parseFilters({
        streaming: 'abc',
        acesso: 'gratis',
        ano_min: '50',
        nota: 'abc',
        duracao_max: '-3',
        idioma: 'portugues',
        ordem: 'aleatorio',
      }),
    ).toEqual(DEFAULT_FILTERS);
  });

  it('junta parâmetros repetidos e descarta só as partes inválidas', () => {
    expect(parseFilters({ streaming: ['8', 'abc,119', '8'] }).providers).toEqual([8, 119]);
  });

  it('troca ano_min e ano_max quando vêm invertidos', () => {
    const f = parseFilters({ ano_min: '2020', ano_max: '2000' });
    expect([f.yearMin, f.yearMax]).toEqual([2000, 2020]);
  });
});

describe('filtersToQuery', () => {
  it('omite padrões', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe('');
  });

  it('serializa na ordem fixa com vírgulas', () => {
    expect(
      filtersToQuery({
        ...DEFAULT_FILTERS,
        providers: [8, 119],
        access: ['rent'],
        genres: [27, 53],
        yearMin: 2000,
        minRating: 7,
        language: 'pt',
        sort: 'az',
      }),
    ).toBe('streaming=8,119&acesso=rent&genero=27,53&ano_min=2000&nota=7&idioma=pt&ordem=az');
  });

  it('ida e volta preserva os filtros', () => {
    const f = parseFilters({ streaming: '337', ano_max: '2010', duracao_max: '90', ordem: 'recentes' });
    expect(parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(f))))).toEqual(f);
  });
});

describe('countExtraFilters', () => {
  it('conta só os filtros da gaveta', () => {
    expect(countExtraFilters({ ...DEFAULT_FILTERS, providers: [8], access: ['buy'] })).toBe(0);
    expect(
      countExtraFilters({ ...DEFAULT_FILTERS, genres: [27, 53], yearMin: 2000, yearMax: 2010, language: 'en' }),
    ).toBe(3);
  });
});

describe('toggle', () => {
  it('adiciona e remove', () => {
    expect(toggle([8], 119)).toEqual([8, 119]);
    expect(toggle([8, 119], 8)).toEqual([119]);
  });
});

describe('parseOffset', () => {
  it('aceita inteiros entre 0 e 10000', () => {
    expect(parseOffset(24)).toBe(24);
    expect(parseOffset(10000)).toBe(10000);
  });
  it('qualquer outra coisa vira 0', () => {
    for (const bad of [-5, 'abc', 1e9, 2.5, null, undefined, Number.NaN]) expect(parseOffset(bad)).toBe(0);
  });
});

describe('parseMovieId', () => {
  it('aceita só dígitos', () => {
    expect(parseMovieId('550')).toBe(550);
    expect(parseMovieId('abc')).toBeNull();
    expect(parseMovieId('5.5')).toBeNull();
    expect(parseMovieId('')).toBeNull();
    expect(parseMovieId('12345678901')).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit src/lib/filters.test.ts`
Expected: FAIL, "Failed to resolve import ./filters"

- [ ] **Step 3: Implementar** — `src/lib/filters.ts`

```ts
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

const idSchema = z.coerce.number().int().positive();
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:unit`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/filters.ts src/lib/filters.test.ts
git commit -m "feat: leitura e serialização dos filtros da URL"
```

---

### Task 4: Busca do catálogo (`search_movies`) e listas de streamings/gêneros

**Files:**
- Create: `supabase/migrations/20260923000100_search.sql`
- Create: `src/lib/queries/types.ts`, `src/lib/queries/searchMovies.ts`, `src/lib/queries/searchMovies.int.test.ts`, `src/lib/queries/lists.ts`, `src/lib/queries/lists.int.test.ts`
- Modify (gerado): `src/lib/supabase/database.types.ts`

**Interfaces:**
- Consumes: `CatalogFilters`, `DEFAULT_FILTERS`, `AccessType` (Task 3); `Database` (Task 2); `anonDb()` (Task 2).
- Produces:
  - `type Db = SupabaseClient<Database>`
  - `interface ProviderRef { id: number; name: string; logoPath: string | null }`
  - `interface GenreRef { id: number; name: string }`
  - `interface MovieCardData { id: number; title: string; releaseDate: string | null; runtime: number | null; voteAverage: number; posterPath: string | null; providers: ProviderRef[] }`
  - `interface SearchResult { movies: MovieCardData[]; total: number }`
  - `PAGE_SIZE = 24`; `searchMovies(db: Db, filters: CatalogFilters, offset: number): Promise<SearchResult>`
  - `listProviders(db: Db): Promise<ProviderRef[]>` (só streamings com filmes, por `display_priority`)
  - `listGenres(db: Db): Promise<GenreRef[]>` (ordem alfabética pt-BR)

- [ ] **Step 1: Escrever os testes que falham** — `src/lib/queries/searchMovies.int.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { DEFAULT_FILTERS, type CatalogFilters } from '@/lib/filters';
import { anonDb } from '../../../tests/support/db';
import { searchMovies } from './searchMovies';

const db = anonDb();
const ids = async (patch: Partial<CatalogFilters>, offset = 0) =>
  (await searchMovies(db, { ...DEFAULT_FILTERS, ...patch }, offset)).movies.map((m) => m.id);

describe('searchMovies', () => {
  it('padrão: populares, 24 por bloco, total sem filmes fora de streaming', async () => {
    const result = await searchMovies(db, DEFAULT_FILTERS, 0);
    expect(result.total).toBe(38);
    expect(result.movies).toHaveLength(24);
    expect(result.movies.slice(0, 8).map((m) => m.id)).toEqual([7, 1, 2, 4, 3, 5, 8, 6]);
    expect(result.movies.map((m) => m.id)).not.toContain(9);
  });

  it('segundo bloco começa no deslocamento', async () => {
    const result = await searchMovies(db, DEFAULT_FILTERS, 24);
    expect(result.movies).toHaveLength(14);
    expect(result.movies[0].id).toBe(117);
    expect(result.total).toBe(38);
  });

  it('streaming', async () => expect(await ids({ providers: [8] })).toEqual([1, 3, 6]));
  it('streaming + tipo de acesso no mesmo vínculo', async () =>
    expect(await ids({ providers: [119], access: ['rent'] })).toEqual([1, 5]));
  it('tipo de acesso', async () => expect(await ids({ access: ['buy'] })).toEqual([7, 1, 3]));
  it('gêneros com OU', async () => expect(await ids({ genres: [27, 53] })).toEqual([1, 2, 4, 5]));
  it('faixa de ano exclui sem data', async () =>
    expect(await ids({ yearMin: 2018, yearMax: 2019 })).toEqual([2, 4, 5]));
  it('nota mínima', async () => expect(await ids({ minRating: 7.5 })).toEqual([7, 1, 3, 6]));
  it('duração máxima exclui sem duração', async () =>
    expect(await ids({ maxRuntime: 120 })).toEqual([7, 1, 4, 6]));
  it('idioma original', async () => expect(await ids({ language: 'pt' })).toEqual([3, 5]));

  it('ordem por nota ignora filmes com menos de 50 votos', async () => {
    const result = await searchMovies(db, { ...DEFAULT_FILTERS, sort: 'nota' }, 0);
    expect(result.total).toBe(37);
    expect(result.movies.slice(0, 7).map((m) => m.id)).toEqual([3, 7, 1, 2, 5, 4, 8]);
  });

  it('ordem por lançamento põe sem data no fim', async () => {
    const result = await searchMovies(db, { ...DEFAULT_FILTERS, sort: 'recentes' }, 24);
    expect((await ids({ sort: 'recentes' })).slice(0, 7)).toEqual([6, 5, 4, 2, 1, 7, 3]);
    expect(result.movies.at(-1)?.id).toBe(8);
  });

  it('ordem A–Z', async () =>
    expect(await ids({ language: 'en', sort: 'az' })).toEqual([1, 6, 2, 7, 4, 8]));

  it('card traz cada streaming uma vez, na ordem de prioridade', async () => {
    const [movie] = (await searchMovies(db, { ...DEFAULT_FILTERS, providers: [8], sort: 'az' }, 0)).movies;
    expect(movie.id).toBe(3);
    expect(movie.providers).toEqual([
      { id: 8, name: 'Netflix', logoPath: null },
      { id: 119, name: 'Amazon Prime Video', logoPath: null },
    ]);
    const corra = (await searchMovies(db, { ...DEFAULT_FILTERS, providers: [8] }, 0)).movies[0];
    expect(corra.providers.map((p) => p.id)).toEqual([8, 119]);
  });

  it('sem resultados', async () => {
    expect(await searchMovies(db, { ...DEFAULT_FILTERS, language: 'zz' }, 0)).toEqual({ movies: [], total: 0 });
  });
});
```

`src/lib/queries/lists.int.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { listGenres, listProviders } from './lists';

describe('listProviders', () => {
  it('só streamings com filmes, por prioridade', async () => {
    expect((await listProviders(anonDb())).map((p) => p.id)).toEqual([8, 119, 337, 1899]);
  });
});

describe('listGenres', () => {
  it('ordem alfabética em português', async () => {
    expect((await listGenres(anonDb())).map((g) => g.name)).toEqual([
      'Ação',
      'Documentário',
      'Drama',
      'Terror',
      'Thriller',
    ]);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:int`
Expected: FAIL, "Failed to resolve import ./searchMovies" e "./lists"

- [ ] **Step 3: Criar `supabase/migrations/20260923000100_search.sql`**

```sql
create view public.available_providers with (security_invoker = on) as
  select p.id, p.name, p.logo_path, p.display_priority
  from public.providers p
  where exists (select 1 from public.movie_providers mp where mp.provider_id = p.id);

grant select on public.available_providers to anon, authenticated;

create or replace function public.search_movies(
  p_providers integer[] default null,
  p_access public.access_type[] default null,
  p_genres integer[] default null,
  p_year_min integer default null,
  p_year_max integer default null,
  p_min_rating numeric default null,
  p_max_runtime integer default null,
  p_language text default null,
  p_sort text default 'populares',
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
language sql
stable
security invoker
set search_path = public
as $$
  with filtered as (
    select m.*
    from movies m
    where exists (
        select 1 from movie_providers mp
        where mp.movie_id = m.id
          and (p_providers is null or mp.provider_id = any (p_providers))
          and (p_access is null or mp.access_type = any (p_access))
      )
      and (p_genres is null or exists (
        select 1 from movie_genres mg where mg.movie_id = m.id and mg.genre_id = any (p_genres)
      ))
      and (p_year_min is null or m.release_date >= make_date(p_year_min, 1, 1))
      and (p_year_max is null or m.release_date <= make_date(p_year_max, 12, 31))
      and (p_min_rating is null or m.vote_average >= p_min_rating)
      and (p_max_runtime is null or m.runtime <= p_max_runtime)
      and (p_language is null or m.original_language = p_language)
      and (p_sort <> 'nota' or m.vote_count >= 50)
  )
  select
    f.id,
    f.title,
    f.release_date,
    f.runtime,
    f.vote_average,
    f.poster_path,
    (
      select coalesce(
        jsonb_agg(jsonb_build_object('id', p.id, 'name', p.name, 'logo_path', p.logo_path)
                  order by p.display_priority, p.id),
        '[]'::jsonb)
      from providers p
      where exists (select 1 from movie_providers mp where mp.movie_id = f.id and mp.provider_id = p.id)
    ) as providers,
    count(*) over () as total_count
  from filtered f
  order by
    case when p_sort = 'nota' then f.vote_average end desc nulls last,
    case when p_sort = 'recentes' then f.release_date end desc nulls last,
    case when p_sort = 'az' then f.title end asc,
    f.popularity desc,
    f.id
  limit p_limit offset p_offset;
$$;

grant execute on function public.search_movies to anon, authenticated;
```

- [ ] **Step 4: Aplicar e regerar os tipos**

```bash
npx supabase db reset
npm run db:types
```
Expected: `database.types.ts` contém `search_movies` em `Functions` e `available_providers` em `Views`.

- [ ] **Step 5: Implementar** — `src/lib/queries/types.ts`

```ts
import type { SupabaseClient } from '@supabase/supabase-js';
import type { AccessType } from '@/lib/filters';
import type { Database } from '@/lib/supabase/database.types';

export type Db = SupabaseClient<Database>;

export interface ProviderRef {
  id: number;
  name: string;
  logoPath: string | null;
}

export interface GenreRef {
  id: number;
  name: string;
}

export interface MovieCardData {
  id: number;
  title: string;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number;
  posterPath: string | null;
  providers: ProviderRef[];
}

export interface SearchResult {
  movies: MovieCardData[];
  total: number;
}

export interface MovieDetails {
  id: number;
  title: string;
  originalTitle: string;
  overview: string | null;
  releaseDate: string | null;
  runtime: number | null;
  voteAverage: number;
  posterPath: string | null;
  backdropPath: string | null;
  trailerKey: string | null;
  genres: string[];
  watch: Record<AccessType, ProviderRef[]>;
}
```

`src/lib/queries/searchMovies.ts`:

```ts
import type { CatalogFilters } from '@/lib/filters';
import type { Db, ProviderRef, SearchResult } from './types';

export const PAGE_SIZE = 24;

interface RawProvider {
  id: number;
  name: string;
  logo_path: string | null;
}

export async function searchMovies(db: Db, filters: CatalogFilters, offset: number): Promise<SearchResult> {
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
    p_limit: PAGE_SIZE,
    p_offset: offset,
  });
  if (error) throw new Error(`search_movies: ${error.message}`);

  const rows = data ?? [];
  return {
    total: rows[0]?.total_count ?? 0,
    movies: rows.map((row) => ({
      id: row.id,
      title: row.title,
      releaseDate: row.release_date,
      runtime: row.runtime,
      voteAverage: row.vote_average,
      posterPath: row.poster_path,
      providers: (row.providers as unknown as RawProvider[]).map(
        (p): ProviderRef => ({ id: p.id, name: p.name, logoPath: p.logo_path }),
      ),
    })),
  };
}
```

Com offset além do fim, a busca não retorna linhas e `total` vem 0. O site só pede o próximo bloco enquanto `movies.length < total`, então isso não aparece na tela.

`src/lib/queries/lists.ts`:

```ts
import type { Db, GenreRef, ProviderRef } from './types';

export async function listProviders(db: Db): Promise<ProviderRef[]> {
  const { data, error } = await db
    .from('available_providers')
    .select('id, name, logo_path')
    .order('display_priority')
    .order('id');
  if (error) throw new Error(`available_providers: ${error.message}`);
  return (data ?? []).map((p) => ({ id: p.id!, name: p.name!, logoPath: p.logo_path }));
}

export async function listGenres(db: Db): Promise<GenreRef[]> {
  const { data, error } = await db.from('genres').select('id, name');
  if (error) throw new Error(`genres: ${error.message}`);
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm run test:int && npm run typecheck`
Expected: todos PASS; sem erros de tipo

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat(db): função search_movies e listas de streamings e gêneros"
```

---

### Task 5: Consulta da página do filme (`getMovie`)

**Files:**
- Create: `src/lib/queries/getMovie.ts`, `src/lib/queries/getMovie.int.test.ts`

**Interfaces:**
- Consumes: `Db`, `MovieDetails`, `ProviderRef` (Task 4); `ACCESS_TYPES` (Task 3).
- Produces: `getMovie(db: Db, id: number): Promise<MovieDetails | null>`. Retorna `null` se o filme não existe **ou** não está em nenhum streaming; `genres` em ordem alfabética; cada grupo de `watch` na ordem de `display_priority`.

- [ ] **Step 1: Escrever o teste que falha** — `src/lib/queries/getMovie.int.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { getMovie } from './getMovie';

const db = anonDb();

describe('getMovie', () => {
  it('traz detalhes, gêneros e onde assistir agrupado', async () => {
    expect(await getMovie(db, 1)).toEqual({
      id: 1,
      title: 'Corra!',
      originalTitle: 'Get Out',
      overview: 'Um jovem visita a família da namorada e descobre segredos perturbadores.',
      releaseDate: '2017-02-24',
      runtime: 104,
      voteAverage: 7.6,
      posterPath: null,
      backdropPath: null,
      trailerKey: 'sRfnevzM9kQ',
      genres: ['Terror', 'Thriller'],
      watch: {
        flatrate: [{ id: 8, name: 'Netflix', logoPath: null }],
        rent: [{ id: 119, name: 'Amazon Prime Video', logoPath: null }],
        buy: [{ id: 119, name: 'Amazon Prime Video', logoPath: null }],
      },
    });
  });

  it('null para filme fora de qualquer streaming', async () => {
    expect(await getMovie(db, 9)).toBeNull();
  });

  it('null para filme inexistente', async () => {
    expect(await getMovie(db, 999999)).toBeNull();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project integration src/lib/queries/getMovie.int.test.ts`
Expected: FAIL, "Failed to resolve import ./getMovie"

- [ ] **Step 3: Implementar** — `src/lib/queries/getMovie.ts`

```ts
import { ACCESS_TYPES, type AccessType } from '@/lib/filters';
import type { Db, MovieDetails, ProviderRef } from './types';

export async function getMovie(db: Db, id: number): Promise<MovieDetails | null> {
  const { data, error } = await db
    .from('movies')
    .select(
      `id, title, original_title, overview, release_date, runtime, vote_average,
       poster_path, backdrop_path, trailer_key,
       movie_genres ( genres ( name ) ),
       movie_providers ( access_type, providers ( id, name, logo_path, display_priority ) )`,
    )
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(`getMovie(${id}): ${error.message}`);
  if (!data || data.movie_providers.length === 0) return null;

  const watch = Object.fromEntries(ACCESS_TYPES.map((t) => [t, [] as (ProviderRef & { priority: number })[]])) as Record<
    AccessType,
    (ProviderRef & { priority: number })[]
  >;
  for (const link of data.movie_providers) {
    const p = link.providers;
    if (p) watch[link.access_type].push({ id: p.id, name: p.name, logoPath: p.logo_path, priority: p.display_priority });
  }

  return {
    id: data.id,
    title: data.title,
    originalTitle: data.original_title,
    overview: data.overview,
    releaseDate: data.release_date,
    runtime: data.runtime,
    voteAverage: data.vote_average,
    posterPath: data.poster_path,
    backdropPath: data.backdrop_path,
    trailerKey: data.trailer_key,
    genres: data.movie_genres
      .flatMap((g) => (g.genres ? [g.genres.name] : []))
      .sort((a, b) => a.localeCompare(b, 'pt-BR')),
    watch: Object.fromEntries(
      ACCESS_TYPES.map((t) => [
        t,
        watch[t]
          .sort((a, b) => a.priority - b.priority || a.id - b.id)
          .map(({ id: providerId, name, logoPath }) => ({ id: providerId, name, logoPath })),
      ]),
    ) as Record<AccessType, ProviderRef[]>,
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:int && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/queries/getMovie.ts src/lib/queries/getMovie.int.test.ts
git commit -m "feat: consulta de detalhes do filme com onde assistir"
```

---

### Task 6: Cliente TMDB (sincronizador)

**Files:**
- Create: `sync/tmdb.ts`, `sync/tmdb.test.ts`

**Interfaces:**
- Consumes: `AccessType` de `../src/lib/filters` (Task 3).
- Produces:
  - `class TmdbError extends Error { status: number; path: string }`
  - tipos `TmdbProvider { provider_id; provider_name; logo_path: string | null; display_priority: number; display_priorities?: Record<string, number> }`, `TmdbGenre { id; name }`, `TmdbMovie { id; title; original_title; overview; release_date; vote_average; vote_count; popularity; original_language; poster_path: string | null; backdrop_path: string | null; genre_ids: number[] }`, `TmdbVideo { key; site; type; official; iso_639_1; published_at }`, `TmdbDetails { id; runtime: number | null; backdrop_path: string | null; videos?: { results: TmdbVideo[] } }`, `DateRange { gte: string; lte: string }`, `DiscoverParams { providerId: number; accessType: AccessType; page: number; range?: DateRange }`, `DiscoverPage { page; total_pages; total_results; results: TmdbMovie[] }`
  - `interface TmdbClient { getProviders(): Promise<TmdbProvider[]>; getGenres(): Promise<TmdbGenre[]>; discover(p: DiscoverParams): Promise<DiscoverPage>; getDetails(id: number): Promise<TmdbDetails> }`
  - `createTmdbClient(opts: { token: string; fetchFn?: typeof fetch; sleep?: (ms: number) => Promise<void>; requestsPerSecond?: number; retryDelaysMs?: number[]; baseUrl?: string }): TmdbClient`

- [ ] **Step 1: Escrever os testes que falham** — `sync/tmdb.test.ts`

```ts
import { describe, expect, it, vi } from 'vitest';
import { TmdbError, createTmdbClient } from './tmdb';

function fakeFetch(responses: { status: number; body?: unknown }[]) {
  const urls: string[] = [];
  const headers: HeadersInit[] = [];
  const fn = vi.fn(async (url: string | URL, init?: RequestInit) => {
    urls.push(String(url));
    headers.push(init?.headers ?? {});
    const next = responses.shift() ?? { status: 200, body: {} };
    return new Response(JSON.stringify(next.body ?? {}), { status: next.status });
  });
  return { fn: fn as unknown as typeof fetch, urls, headers, calls: () => fn.mock.calls.length };
}

function client(fetchFn: typeof fetch, sleeps: number[] = []) {
  return createTmdbClient({
    token: 'tok',
    fetchFn,
    requestsPerSecond: Infinity,
    sleep: async (ms) => {
      sleeps.push(ms);
    },
  });
}

describe('createTmdbClient', () => {
  it('envia o token e os parâmetros do discover', async () => {
    const f = fakeFetch([{ status: 200, body: { page: 2, total_pages: 3, total_results: 50, results: [] } }]);
    const page = await client(f.fn).discover({
      providerId: 8,
      accessType: 'flatrate',
      page: 2,
      range: { gte: '2000-01-01', lte: '2000-12-31' },
    });
    expect(page.total_pages).toBe(3);
    const url = new URL(f.urls[0]);
    expect(url.pathname).toBe('/3/discover/movie');
    expect(Object.fromEntries(url.searchParams)).toEqual({
      watch_region: 'BR',
      with_watch_providers: '8',
      with_watch_monetization_types: 'flatrate',
      language: 'pt-BR',
      sort_by: 'popularity.desc',
      include_adult: 'false',
      page: '2',
      'primary_release_date.gte': '2000-01-01',
      'primary_release_date.lte': '2000-12-31',
    });
    expect(f.headers[0]).toMatchObject({ Authorization: 'Bearer tok' });
  });

  it('pede detalhes com vídeos em pt e en', async () => {
    const f = fakeFetch([{ status: 200, body: { id: 1, runtime: 100, backdrop_path: null } }]);
    await client(f.fn).getDetails(1);
    const url = new URL(f.urls[0]);
    expect(url.pathname).toBe('/3/movie/1');
    expect(url.searchParams.get('append_to_response')).toBe('videos');
    expect(url.searchParams.get('include_video_language')).toBe('pt,en,null');
  });

  it('tenta de novo em 429 com espera crescente', async () => {
    const sleeps: number[] = [];
    const f = fakeFetch([{ status: 429 }, { status: 503 }, { status: 200, body: { genres: [{ id: 1, name: 'x' }] } }]);
    expect(await client(f.fn, sleeps).getGenres()).toEqual([{ id: 1, name: 'x' }]);
    expect(sleeps).toEqual([1000, 2000]);
  });

  it('desiste depois de 3 novas tentativas', async () => {
    const f = fakeFetch([{ status: 500 }, { status: 500 }, { status: 500 }, { status: 500 }]);
    await expect(client(f.fn).getGenres()).rejects.toMatchObject({ status: 500 });
    expect(f.calls()).toBe(4);
  });

  it('404 falha na hora com TmdbError', async () => {
    const f = fakeFetch([{ status: 404 }]);
    const error = await client(f.fn).getDetails(99).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(TmdbError);
    expect(error).toMatchObject({ status: 404, path: '/movie/99' });
    expect(f.calls()).toBe(1);
  });

  it('respeita o limite de requisições por segundo', async () => {
    const sleeps: number[] = [];
    const f = fakeFetch([]);
    const c = createTmdbClient({ token: 't', fetchFn: f.fn, requestsPerSecond: 10, sleep: async (ms) => void sleeps.push(ms) });
    await Promise.all([c.getGenres(), c.getGenres(), c.getGenres()]);
    expect(sleeps.length).toBe(2);
    expect(sleeps.every((ms) => ms > 0 && ms <= 200)).toBe(true);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit sync/tmdb.test.ts`
Expected: FAIL, "Failed to resolve import ./tmdb"

- [ ] **Step 3: Implementar** — `sync/tmdb.ts`

```ts
import type { AccessType } from '../src/lib/filters';

export class TmdbError extends Error {
  constructor(
    public readonly status: number,
    public readonly path: string,
  ) {
    super(`TMDB respondeu ${status} em ${path}`);
    this.name = 'TmdbError';
  }
}

export interface TmdbProvider {
  provider_id: number;
  provider_name: string;
  logo_path: string | null;
  display_priority: number;
  display_priorities?: Record<string, number>;
}

export interface TmdbGenre {
  id: number;
  name: string;
}

export interface TmdbMovie {
  id: number;
  title: string;
  original_title: string;
  overview: string;
  release_date: string;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
  genre_ids: number[];
}

export interface TmdbVideo {
  key: string;
  site: string;
  type: string;
  official: boolean;
  iso_639_1: string | null;
  published_at: string;
}

export interface TmdbDetails {
  id: number;
  runtime: number | null;
  backdrop_path: string | null;
  videos?: { results: TmdbVideo[] };
}

export interface DateRange {
  gte: string;
  lte: string;
}

export interface DiscoverParams {
  providerId: number;
  accessType: AccessType;
  page: number;
  range?: DateRange;
}

export interface DiscoverPage {
  page: number;
  total_pages: number;
  total_results: number;
  results: TmdbMovie[];
}

export interface TmdbClient {
  getProviders(): Promise<TmdbProvider[]>;
  getGenres(): Promise<TmdbGenre[]>;
  discover(params: DiscoverParams): Promise<DiscoverPage>;
  getDetails(id: number): Promise<TmdbDetails>;
}

export interface TmdbClientOptions {
  token: string;
  fetchFn?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  requestsPerSecond?: number;
  retryDelaysMs?: number[];
  baseUrl?: string;
}

type Params = Record<string, string | number | undefined>;

export function createTmdbClient(opts: TmdbClientOptions): TmdbClient {
  const fetchFn = opts.fetchFn ?? fetch;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)));
  const interval = 1000 / (opts.requestsPerSecond ?? 20);
  const retryDelays = opts.retryDelaysMs ?? [1000, 2000, 4000];
  const baseUrl = opts.baseUrl ?? 'https://api.themoviedb.org/3';
  let nextSlot = 0;

  async function throttle() {
    const now = Date.now();
    const start = Math.max(now, nextSlot);
    nextSlot = start + interval;
    if (start > now) await sleep(start - now);
  }

  async function get<T>(path: string, params: Params): Promise<T> {
    const url = new URL(baseUrl + path);
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined) url.searchParams.set(key, String(value));
    }

    for (let attempt = 0; ; attempt++) {
      await throttle();
      let response: Response | undefined;
      let networkError: unknown;
      try {
        response = await fetchFn(url, {
          headers: { Authorization: `Bearer ${opts.token}`, accept: 'application/json' },
        });
      } catch (error) {
        networkError = error;
      }

      if (response?.ok) return (await response.json()) as T;

      const retryable = !response || response.status === 429 || response.status >= 500;
      if (!retryable || attempt >= retryDelays.length) {
        if (response) throw new TmdbError(response.status, path);
        throw networkError;
      }
      await sleep(retryDelays[attempt]);
    }
  }

  return {
    async getProviders() {
      const body = await get<{ results: TmdbProvider[] }>('/watch/providers/movie', {
        language: 'pt-BR',
        watch_region: 'BR',
      });
      return body.results;
    },
    async getGenres() {
      const body = await get<{ genres: TmdbGenre[] }>('/genre/movie/list', { language: 'pt-BR' });
      return body.genres;
    },
    discover({ providerId, accessType, page, range }) {
      return get<DiscoverPage>('/discover/movie', {
        watch_region: 'BR',
        with_watch_providers: providerId,
        with_watch_monetization_types: accessType,
        language: 'pt-BR',
        sort_by: 'popularity.desc',
        include_adult: 'false',
        page,
        'primary_release_date.gte': range?.gte,
        'primary_release_date.lte': range?.lte,
      });
    },
    getDetails(id) {
      return get<TmdbDetails>(`/movie/${id}`, {
        language: 'pt-BR',
        append_to_response: 'videos',
        include_video_language: 'pt,en,null',
      });
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npx vitest run --project unit sync/tmdb.test.ts && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sync/tmdb.ts sync/tmdb.test.ts
git commit -m "feat(sync): cliente TMDB com limite de requisições e novas tentativas"
```

---

### Task 7: Trailer, varredura do discover e concorrência limitada

**Files:**
- Create: `sync/trailer.ts`, `sync/trailer.test.ts`, `sync/scan.ts`, `sync/scan.test.ts`, `sync/pool.ts`, `sync/pool.test.ts`

**Interfaces:**
- Consumes: `TmdbVideo`, `TmdbClient`, `TmdbMovie`, `DateRange` (Task 6); `AccessType` (Task 3).
- Produces:
  - `pickTrailer(videos: TmdbVideo[]): string | null`
  - `MAX_PAGES = 500`; `splitRange(range: DateRange): [DateRange, DateRange] | null`; `fullRange(now?: Date): DateRange`
  - `scanDiscover(tmdb: Pick<TmdbClient, 'discover'>, query: { providerId: number; accessType: AccessType }, onPage: (movies: TmdbMovie[]) => Promise<void>, opts?: { log?: (msg: string) => void; range?: DateRange; fullRange?: DateRange }): Promise<void>`
  - `mapWithConcurrency<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void>`

- [ ] **Step 1: Escrever os testes que falham**

`sync/trailer.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { TmdbVideo } from './tmdb';
import { pickTrailer } from './trailer';

const video = (patch: Partial<TmdbVideo>): TmdbVideo => ({
  key: 'k',
  site: 'YouTube',
  type: 'Trailer',
  official: true,
  iso_639_1: 'en',
  published_at: '2020-01-01T00:00:00.000Z',
  ...patch,
});

describe('pickTrailer', () => {
  it('prefere português', () => {
    expect(pickTrailer([video({ key: 'en' }), video({ key: 'pt', iso_639_1: 'pt' })])).toBe('pt');
  });
  it('depois inglês, depois outros idiomas', () => {
    expect(pickTrailer([video({ key: 'fr', iso_639_1: 'fr' }), video({ key: 'en' })])).toBe('en');
    expect(pickTrailer([video({ key: 'fr', iso_639_1: 'fr' })])).toBe('fr');
  });
  it('oficial antes de não oficial, depois o mais recente', () => {
    expect(
      pickTrailer([
        video({ key: 'fan', official: false, published_at: '2024-01-01T00:00:00.000Z' }),
        video({ key: 'old' }),
        video({ key: 'new', published_at: '2021-01-01T00:00:00.000Z' }),
      ]),
    ).toBe('new');
  });
  it('ignora quem não é trailer do YouTube', () => {
    expect(pickTrailer([video({ site: 'Vimeo' }), video({ type: 'Teaser' })])).toBeNull();
    expect(pickTrailer([])).toBeNull();
  });
});
```

`sync/scan.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { fullRange, scanDiscover, splitRange } from './scan';
import type { DateRange, DiscoverParams, DiscoverPage } from './tmdb';

const year = (date: string) => Number(date.slice(0, 4));
const span = (r: DateRange) => year(r.lte) - year(r.gte) + 1;

function stub(totalPages: (p: DiscoverParams) => number) {
  const calls: DiscoverParams[] = [];
  return {
    calls,
    async discover(p: DiscoverParams): Promise<DiscoverPage> {
      calls.push(p);
      return { page: p.page, total_pages: totalPages(p), total_results: 0, results: [{ id: p.page } as never] };
    },
  };
}

describe('splitRange', () => {
  it('divide ao meio pelos anos', () => {
    expect(splitRange({ gte: '1870-01-01', lte: '2027-12-31' })).toEqual([
      { gte: '1870-01-01', lte: '1948-12-31' },
      { gte: '1949-01-01', lte: '2027-12-31' },
    ]);
  });
  it('não divide um ano só', () => {
    expect(splitRange({ gte: '2020-01-01', lte: '2020-12-31' })).toBeNull();
  });
});

describe('fullRange', () => {
  it('vai de 1870 até o fim do ano seguinte', () => {
    expect(fullRange(new Date('2026-09-23T00:00:00Z'))).toEqual({ gte: '1870-01-01', lte: '2027-12-31' });
  });
});

describe('scanDiscover', () => {
  const query = { providerId: 8, accessType: 'flatrate' as const };

  it('percorre todas as páginas quando cabe no limite', async () => {
    const tmdb = stub(() => 3);
    const pages: number[] = [];
    await scanDiscover(tmdb, query, async (movies) => void pages.push(movies[0].id));
    expect(pages).toEqual([1, 2, 3]);
    expect(tmdb.calls.every((c) => c.range === undefined)).toBe(true);
  });

  it('divide por anos quando passa de 500 páginas', async () => {
    const tmdb = stub((p) => (!p.range || span(p.range) > 1 ? 600 : 2));
    let pageCount = 0;
    await scanDiscover(tmdb, query, async () => void pageCount++, {
      fullRange: { gte: '2000-01-01', lte: '2003-12-31' },
    });
    expect(pageCount).toBe(8);
    const fetched = tmdb.calls.filter((c) => c.range && span(c.range) === 1);
    expect(new Set(fetched.map((c) => c.range!.gte))).toEqual(
      new Set(['2000-01-01', '2001-01-01', '2002-01-01', '2003-01-01']),
    );
  });

  it('um ano só com mais de 500 páginas para em 500 e avisa', async () => {
    const tmdb = stub(() => 600);
    const logs: string[] = [];
    let pageCount = 0;
    await scanDiscover(tmdb, query, async () => void pageCount++, {
      range: { gte: '2020-01-01', lte: '2020-12-31' },
      log: (m) => logs.push(m),
    });
    expect(pageCount).toBe(500);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('500');
  });
});
```

`sync/pool.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { mapWithConcurrency } from './pool';

describe('mapWithConcurrency', () => {
  it('processa tudo sem passar do limite', async () => {
    let running = 0;
    let peak = 0;
    const done: number[] = [];
    await mapWithConcurrency([1, 2, 3, 4, 5, 6, 7], 3, async (n) => {
      running++;
      peak = Math.max(peak, running);
      await new Promise((r) => setTimeout(r, 5));
      done.push(n);
      running--;
    });
    expect(done.sort()).toEqual([1, 2, 3, 4, 5, 6, 7]);
    expect(peak).toBe(3);
  });

  it('rejeita quando uma tarefa falha', async () => {
    await expect(
      mapWithConcurrency([1, 2], 2, async (n) => {
        if (n === 2) throw new Error('falhou');
      }),
    ).rejects.toThrow('falhou');
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project unit sync/trailer.test.ts sync/scan.test.ts sync/pool.test.ts`
Expected: FAIL, "Failed to resolve import" dos três módulos

- [ ] **Step 3: Implementar**

`sync/trailer.ts`:

```ts
import type { TmdbVideo } from './tmdb';

const languageRank = (lang: string | null) => (lang === 'pt' ? 0 : lang === 'en' ? 1 : 2);

export function pickTrailer(videos: TmdbVideo[]): string | null {
  const trailers = videos
    .filter((v) => v.site === 'YouTube' && v.type === 'Trailer')
    .sort(
      (a, b) =>
        languageRank(a.iso_639_1) - languageRank(b.iso_639_1) ||
        Number(b.official) - Number(a.official) ||
        b.published_at.localeCompare(a.published_at),
    );
  return trailers[0]?.key ?? null;
}
```

`sync/scan.ts`:

```ts
import type { AccessType } from '../src/lib/filters';
import type { DateRange, TmdbClient, TmdbMovie } from './tmdb';

export const MAX_PAGES = 500;

export function fullRange(now = new Date()): DateRange {
  return { gte: '1870-01-01', lte: `${now.getUTCFullYear() + 1}-12-31` };
}

export function splitRange(range: DateRange): [DateRange, DateRange] | null {
  const from = Number(range.gte.slice(0, 4));
  const to = Number(range.lte.slice(0, 4));
  if (from >= to) return null;
  const mid = Math.floor((from + to) / 2);
  return [
    { gte: range.gte, lte: `${mid}-12-31` },
    { gte: `${mid + 1}-01-01`, lte: range.lte },
  ];
}

export interface ScanOptions {
  log?: (msg: string) => void;
  range?: DateRange;
  fullRange?: DateRange;
}

// Filmes sem data de lançamento só entram quando a consulta cabe em 500 páginas sem dividir;
// ao dividir por datas, o TMDB deixa de fora quem não tem data. É uma perda aceitável.
export async function scanDiscover(
  tmdb: Pick<TmdbClient, 'discover'>,
  query: { providerId: number; accessType: AccessType },
  onPage: (movies: TmdbMovie[]) => Promise<void>,
  opts: ScanOptions = {},
): Promise<void> {
  const log = opts.log ?? (() => {});

  async function scan(range: DateRange | undefined): Promise<void> {
    const first = await tmdb.discover({ ...query, page: 1, range });
    if (first.total_pages > MAX_PAGES) {
      const halves = splitRange(range ?? opts.fullRange ?? fullRange());
      if (halves) {
        for (const half of halves) await scan(half);
        return;
      }
      log(
        `aviso: streaming ${query.providerId}/${query.accessType} em ${range?.gte}..${range?.lte} tem ` +
          `${first.total_pages} páginas; lendo só as primeiras ${MAX_PAGES}`,
      );
    }
    await onPage(first.results);
    const last = Math.min(first.total_pages, MAX_PAGES);
    for (let page = 2; page <= last; page++) {
      const next = await tmdb.discover({ ...query, page, range });
      await onPage(next.results);
    }
  }

  await scan(opts.range);
}
```

`sync/pool.ts`:

```ts
export async function mapWithConcurrency<T>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<void>,
): Promise<void> {
  let index = 0;
  const worker = async () => {
    while (index < items.length) {
      const item = items[index++];
      await fn(item);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:unit && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add sync/trailer.ts sync/trailer.test.ts sync/scan.ts sync/scan.test.ts sync/pool.ts sync/pool.test.ts
git commit -m "feat(sync): escolha de trailer, varredura com divisão por anos e concorrência limitada"
```

---

### Task 8: Orquestração da sincronização (`runSync`)

**Files:**
- Create: `sync/repository.ts`, `sync/sync.ts`, `sync/sync.test.ts`, `sync/testing/fake-tmdb.ts`, `sync/testing/memory-repository.ts`

**Interfaces:**
- Consumes: `TmdbClient`, `TmdbError`, `TmdbMovie`, `TmdbProvider`, `TmdbDetails`, `TmdbGenre`, `DiscoverParams`, `DiscoverPage` (Task 6); `pickTrailer`, `scanDiscover`, `mapWithConcurrency` (Task 7); `ACCESS_TYPES`, `AccessType` (Task 3).
- Produces:
  - `sync/repository.ts`: `ProviderRow { id; name; logo_path: string | null; display_priority: number }`, `GenreRow { id; name }`, `MovieRow { id; title; original_title; overview: string | null; release_date: string | null; vote_average; vote_count; popularity; original_language; poster_path: string | null; backdrop_path: string | null }`, `MovieGenreRow { movie_id; genre_id }`, `MovieProviderRow { movie_id; provider_id; access_type: AccessType }`, `MovieDetailsUpdate { runtime: number | null; backdrop_path: string | null; trailer_key: string | null; details_synced_at: string }`, e a interface `CatalogRepository` com `upsertProviders(rows)`, `upsertGenres(rows)`, `existingMovieIds(ids: number[]): Promise<Set<number>>`, `upsertMovies(rows)`, `upsertMovieGenres(rows)`, `touchMovieProviders(rows, seenAt: string)`, `listMoviesNeedingDetails(staleBefore: string): Promise<number[]>`, `updateMovieDetails(id, update)`, `deleteStaleMovieProviders(before: string): Promise<number>` (todas as outras `Promise<void>`)
  - `sync/sync.ts`: `interface SyncSummary { added: number; updated: number; unlinked: number; detailsFetched: number; detailsSkipped: number }`, `runSync(deps: { tmdb: TmdbClient; repo: CatalogRepository; now?: () => Date; log?: (msg: string) => void; detailsConcurrency?: number }): Promise<SyncSummary>`

- [ ] **Step 1: Criar `sync/repository.ts`** (só tipos; os testes precisam dele)

```ts
import type { AccessType } from '../src/lib/filters';

export interface ProviderRow {
  id: number;
  name: string;
  logo_path: string | null;
  display_priority: number;
}

export interface GenreRow {
  id: number;
  name: string;
}

export interface MovieRow {
  id: number;
  title: string;
  original_title: string;
  overview: string | null;
  release_date: string | null;
  vote_average: number;
  vote_count: number;
  popularity: number;
  original_language: string;
  poster_path: string | null;
  backdrop_path: string | null;
}

export interface MovieGenreRow {
  movie_id: number;
  genre_id: number;
}

export interface MovieProviderRow {
  movie_id: number;
  provider_id: number;
  access_type: AccessType;
}

export interface MovieDetailsUpdate {
  runtime: number | null;
  backdrop_path: string | null;
  trailer_key: string | null;
  details_synced_at: string;
}

export interface CatalogRepository {
  upsertProviders(rows: ProviderRow[]): Promise<void>;
  upsertGenres(rows: GenreRow[]): Promise<void>;
  existingMovieIds(ids: number[]): Promise<Set<number>>;
  upsertMovies(rows: MovieRow[]): Promise<void>;
  upsertMovieGenres(rows: MovieGenreRow[]): Promise<void>;
  touchMovieProviders(rows: MovieProviderRow[], seenAt: string): Promise<void>;
  listMoviesNeedingDetails(staleBefore: string): Promise<number[]>;
  updateMovieDetails(id: number, update: MovieDetailsUpdate): Promise<void>;
  deleteStaleMovieProviders(before: string): Promise<number>;
}
```

- [ ] **Step 2: Criar as versões falsas para os testes**

`sync/testing/fake-tmdb.ts`:

```ts
import {
  TmdbError,
  type DiscoverPage,
  type DiscoverParams,
  type TmdbClient,
  type TmdbDetails,
  type TmdbGenre,
  type TmdbMovie,
  type TmdbProvider,
} from '../tmdb';

export class FakeTmdb implements TmdbClient {
  providers: TmdbProvider[] = [];
  genres: TmdbGenre[] = [];
  /** Chave: `${providerId}:${accessType}` */
  catalog = new Map<string, TmdbMovie[]>();
  details = new Map<number, TmdbDetails>();
  /** Se definido, o discover falha com 500 depois de N chamadas. */
  failDiscoverAfter: number | null = null;
  discoverCalls: DiscoverParams[] = [];
  detailCalls: number[] = [];
  pageSize = 20;

  async getProviders() {
    return this.providers;
  }

  async getGenres() {
    return this.genres;
  }

  async discover(p: DiscoverParams): Promise<DiscoverPage> {
    this.discoverCalls.push(p);
    if (this.failDiscoverAfter !== null && this.discoverCalls.length > this.failDiscoverAfter) {
      throw new TmdbError(500, '/discover/movie');
    }
    const all = this.catalog.get(`${p.providerId}:${p.accessType}`) ?? [];
    const start = (p.page - 1) * this.pageSize;
    return {
      page: p.page,
      total_pages: Math.max(1, Math.ceil(all.length / this.pageSize)),
      total_results: all.length,
      results: all.slice(start, start + this.pageSize),
    };
  }

  async getDetails(id: number): Promise<TmdbDetails> {
    this.detailCalls.push(id);
    const found = this.details.get(id);
    if (!found) throw new TmdbError(404, `/movie/${id}`);
    return found;
  }
}

export function tmdbMovie(id: number, patch: Partial<TmdbMovie> = {}): TmdbMovie {
  return {
    id,
    title: `Filme ${id}`,
    original_title: `Movie ${id}`,
    overview: '',
    release_date: '2020-01-01',
    vote_average: 7,
    vote_count: 100,
    popularity: 10,
    original_language: 'en',
    poster_path: null,
    backdrop_path: null,
    genre_ids: [],
    ...patch,
  };
}
```

`sync/testing/memory-repository.ts`:

```ts
import type {
  CatalogRepository,
  GenreRow,
  MovieDetailsUpdate,
  MovieGenreRow,
  MovieProviderRow,
  MovieRow,
  ProviderRow,
} from '../repository';

function assertNoDuplicates(keys: string[]) {
  // O Postgres rejeita a mesma linha duas vezes num único upsert.
  if (new Set(keys).size !== keys.length) {
    throw new Error('ON CONFLICT DO UPDATE command cannot affect row a second time');
  }
}

export class MemoryRepository implements CatalogRepository {
  providers = new Map<number, ProviderRow>();
  genres = new Map<number, GenreRow>();
  movies = new Map<number, MovieRow & Partial<MovieDetailsUpdate>>();
  movieGenres = new Set<string>();
  links = new Map<string, MovieProviderRow & { last_seen_at: string }>();

  async upsertProviders(rows: ProviderRow[]) {
    for (const row of rows) this.providers.set(row.id, row);
  }

  async upsertGenres(rows: GenreRow[]) {
    for (const row of rows) this.genres.set(row.id, row);
  }

  async existingMovieIds(ids: number[]) {
    return new Set(ids.filter((id) => this.movies.has(id)));
  }

  async upsertMovies(rows: MovieRow[]) {
    assertNoDuplicates(rows.map((r) => String(r.id)));
    for (const row of rows) this.movies.set(row.id, { ...this.movies.get(row.id), ...row });
  }

  async upsertMovieGenres(rows: MovieGenreRow[]) {
    for (const row of rows) {
      if (!this.genres.has(row.genre_id)) throw new Error(`FK: gênero ${row.genre_id} não existe`);
      this.movieGenres.add(`${row.movie_id}:${row.genre_id}`);
    }
  }

  async touchMovieProviders(rows: MovieProviderRow[], seenAt: string) {
    const key = (r: MovieProviderRow) => `${r.movie_id}:${r.provider_id}:${r.access_type}`;
    assertNoDuplicates(rows.map(key));
    for (const row of rows) this.links.set(key(row), { ...row, last_seen_at: seenAt });
  }

  async listMoviesNeedingDetails(staleBefore: string) {
    return [...this.movies.values()]
      .filter((m) => !m.details_synced_at || m.details_synced_at < staleBefore)
      .map((m) => m.id)
      .sort((a, b) => a - b);
  }

  async updateMovieDetails(id: number, update: MovieDetailsUpdate) {
    const movie = this.movies.get(id);
    if (movie) this.movies.set(id, { ...movie, ...update });
  }

  async deleteStaleMovieProviders(before: string) {
    let removed = 0;
    for (const [key, link] of this.links) {
      if (link.last_seen_at < before) {
        this.links.delete(key);
        removed++;
      }
    }
    return removed;
  }
}
```

- [ ] **Step 3: Escrever os testes que falham** — `sync/sync.test.ts`

```ts
import { beforeEach, describe, expect, it } from 'vitest';
import { runSync } from './sync';
import { FakeTmdb, tmdbMovie } from './testing/fake-tmdb';
import { MemoryRepository } from './testing/memory-repository';

const DAY = 24 * 60 * 60 * 1000;
const T0 = new Date('2026-09-23T06:00:00.000Z');
const at = (days: number) => () => new Date(T0.getTime() + days * DAY);

let tmdb: FakeTmdb;
let repo: MemoryRepository;

beforeEach(() => {
  tmdb = new FakeTmdb();
  repo = new MemoryRepository();
  tmdb.providers = [
    { provider_id: 8, provider_name: 'Netflix', logo_path: '/n.jpg', display_priority: 5, display_priorities: { BR: 1 } },
    { provider_id: 119, provider_name: 'Prime Video', logo_path: '/p.jpg', display_priority: 7 },
  ];
  tmdb.genres = [{ id: 27, name: 'Terror' }];
  for (const id of [1, 2]) tmdb.details.set(id, { id, runtime: 100 + id, backdrop_path: `/b${id}.jpg` });
});

describe('runSync', () => {
  it('primeira execução grava tudo e busca detalhes', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1, { genre_ids: [27, 999], release_date: '' })]);
    tmdb.details.set(1, {
      id: 1,
      runtime: 104,
      backdrop_path: '/b.jpg',
      videos: {
        results: [
          { key: 'abc', site: 'YouTube', type: 'Trailer', official: true, iso_639_1: 'pt', published_at: '2020-01-01' },
        ],
      },
    });

    const summary = await runSync({ tmdb, repo, now: at(0) });

    expect(summary).toEqual({ added: 1, updated: 0, unlinked: 0, detailsFetched: 1, detailsSkipped: 0 });
    expect(repo.providers.get(8)).toEqual({ id: 8, name: 'Netflix', logo_path: '/n.jpg', display_priority: 1 });
    expect(repo.providers.get(119)?.display_priority).toBe(7);
    expect(repo.movies.get(1)).toMatchObject({
      release_date: null,
      overview: null,
      runtime: 104,
      trailer_key: 'abc',
      details_synced_at: T0.toISOString(),
    });
    expect([...repo.movieGenres]).toEqual(['1:27']);
    expect([...repo.links.keys()]).toEqual(['1:8:flatrate']);
  });

  it('remove ligações de filmes que saíram do streaming', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(2)]);
    await runSync({ tmdb, repo, now: at(0) });

    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    const summary = await runSync({ tmdb, repo, now: at(1) });

    expect(summary).toMatchObject({ added: 0, updated: 1, unlinked: 1 });
    expect([...repo.links.keys()]).toEqual(['1:8:flatrate']);
    expect(repo.movies.has(2)).toBe(true);
  });

  it('falha no meio não apaga nenhuma ligação', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(2)]);
    await runSync({ tmdb, repo, now: at(0) });

    tmdb.failDiscoverAfter = 0;
    await expect(runSync({ tmdb, repo, now: at(1) })).rejects.toMatchObject({ status: 500 });
    expect(repo.links.size).toBe(2);
  });

  it('filme removido do TMDB (404 nos detalhes) é pulado e a limpeza ainda roda', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(3)]);
    const summary = await runSync({ tmdb, repo, now: at(0) });
    expect(summary).toMatchObject({ detailsFetched: 1, detailsSkipped: 1 });

    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    tmdb.details.set(3, { id: 3, runtime: 90, backdrop_path: null });
    const second = await runSync({ tmdb, repo, now: at(1) });
    expect(second.unlinked).toBe(1);
  });

  it('só renova detalhes com mais de 30 dias', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1)]);
    await runSync({ tmdb, repo, now: at(0) });
    tmdb.detailCalls = [];

    await runSync({ tmdb, repo, now: at(10) });
    expect(tmdb.detailCalls).toEqual([]);

    await runSync({ tmdb, repo, now: at(31) });
    expect(tmdb.detailCalls).toEqual([1]);
  });

  it('filme repetido na página ou em vários streamings conta e grava uma vez', async () => {
    tmdb.catalog.set('8:flatrate', [tmdbMovie(1), tmdbMovie(1)]);
    tmdb.catalog.set('119:rent', [tmdbMovie(1)]);
    const summary = await runSync({ tmdb, repo, now: at(0) });
    expect(summary.added).toBe(1);
    expect([...repo.links.keys()].sort()).toEqual(['1:119:rent', '1:8:flatrate']);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `npx vitest run --project unit sync/sync.test.ts`
Expected: FAIL, "Failed to resolve import ./sync"

- [ ] **Step 5: Implementar** — `sync/sync.ts`

```ts
import { ACCESS_TYPES } from '../src/lib/filters';
import { mapWithConcurrency } from './pool';
import type { CatalogRepository, MovieRow, ProviderRow } from './repository';
import { scanDiscover } from './scan';
import { TmdbError, type TmdbClient, type TmdbMovie, type TmdbProvider } from './tmdb';
import { pickTrailer } from './trailer';

const DETAILS_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

export interface SyncSummary {
  added: number;
  updated: number;
  unlinked: number;
  detailsFetched: number;
  detailsSkipped: number;
}

export interface SyncDeps {
  tmdb: TmdbClient;
  repo: CatalogRepository;
  now?: () => Date;
  log?: (msg: string) => void;
  detailsConcurrency?: number;
}

function toProviderRow(p: TmdbProvider): ProviderRow {
  return {
    id: p.provider_id,
    name: p.provider_name,
    logo_path: p.logo_path,
    display_priority: p.display_priorities?.BR ?? p.display_priority,
  };
}

function toMovieRow(m: TmdbMovie): MovieRow {
  return {
    id: m.id,
    title: m.title,
    original_title: m.original_title,
    overview: m.overview || null,
    release_date: m.release_date || null,
    vote_average: m.vote_average,
    vote_count: m.vote_count,
    popularity: m.popularity,
    original_language: m.original_language,
    poster_path: m.poster_path,
    backdrop_path: m.backdrop_path,
  };
}

export async function runSync(deps: SyncDeps): Promise<SyncSummary> {
  const { tmdb, repo } = deps;
  const log = deps.log ?? (() => {});
  const now = (deps.now ?? (() => new Date()))();
  const runStartedAt = now.toISOString();
  const summary: SyncSummary = { added: 0, updated: 0, unlinked: 0, detailsFetched: 0, detailsSkipped: 0 };

  // 1. Referências
  const providers = await tmdb.getProviders();
  await repo.upsertProviders(providers.map(toProviderRow));
  const genres = await tmdb.getGenres();
  await repo.upsertGenres(genres);
  const knownGenres = new Set(genres.map((g) => g.id));
  log(`${providers.length} streamings, ${genres.length} gêneros`);

  // 2. Varredura
  const seen = new Set<number>();
  for (const provider of providers) {
    for (const accessType of ACCESS_TYPES) {
      await scanDiscover(
        tmdb,
        { providerId: provider.provider_id, accessType },
        async (pageMovies) => {
          const movies = [...new Map(pageMovies.map((m) => [m.id, m])).values()];
          if (movies.length === 0) return;

          const existing = await repo.existingMovieIds(movies.map((m) => m.id));
          for (const m of movies) {
            if (seen.has(m.id)) continue;
            seen.add(m.id);
            if (existing.has(m.id)) summary.updated++;
            else summary.added++;
          }

          await repo.upsertMovies(movies.map(toMovieRow));
          await repo.upsertMovieGenres(
            movies.flatMap((m) =>
              m.genre_ids.filter((g) => knownGenres.has(g)).map((genreId) => ({ movie_id: m.id, genre_id: genreId })),
            ),
          );
          await repo.touchMovieProviders(
            movies.map((m) => ({ movie_id: m.id, provider_id: provider.provider_id, access_type: accessType })),
            runStartedAt,
          );
        },
        { log },
      );
    }
  }
  log(`varredura: ${summary.added} novos, ${summary.updated} atualizados`);

  // 3. Detalhes
  const staleBefore = new Date(now.getTime() - DETAILS_MAX_AGE_MS).toISOString();
  const needingDetails = await repo.listMoviesNeedingDetails(staleBefore);
  await mapWithConcurrency(needingDetails, deps.detailsConcurrency ?? 10, async (id) => {
    try {
      const details = await tmdb.getDetails(id);
      await repo.updateMovieDetails(id, {
        runtime: details.runtime || null,
        backdrop_path: details.backdrop_path,
        trailer_key: pickTrailer(details.videos?.results ?? []),
        details_synced_at: runStartedAt,
      });
      summary.detailsFetched++;
    } catch (error) {
      if (error instanceof TmdbError && error.status === 404) {
        summary.detailsSkipped++;
        log(`filme ${id} não existe mais no TMDB; pulando detalhes`);
        return;
      }
      throw error;
    }
  });

  // 4. Limpeza — só chega aqui se nada acima falhou
  summary.unlinked = await repo.deleteStaleMovieProviders(runStartedAt);

  // 5. Resumo
  log(
    `resumo: ${summary.added} adicionados, ${summary.updated} atualizados, ${summary.unlinked} desvinculados, ` +
      `${summary.detailsFetched} detalhes buscados, ${summary.detailsSkipped} pulados`,
  );
  return summary;
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `npm run test:unit && npm run typecheck`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add sync/repository.ts sync/sync.ts sync/sync.test.ts sync/testing
git commit -m "feat(sync): orquestração com limpeza segura e detalhes a cada 30 dias"
```

---

### Task 9: Repositório Supabase e ponto de entrada do sincronizador

**Files:**
- Create: `sync/supabase-repository.ts`, `sync/supabase-repository.int.test.ts`, `sync/main.ts`

**Interfaces:**
- Consumes: `CatalogRepository` e tipos de linha (Task 8); `runSync` (Task 8); `createTmdbClient` (Task 6); `Database` (Task 2); `serviceDb()` (Task 2).
- Produces: `createSupabaseRepository(db: SupabaseClient<Database>): CatalogRepository`; script npm `sync`.

- [ ] **Step 1: Escrever o teste que falha** — `sync/supabase-repository.int.test.ts`

```ts
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { serviceDb } from '../tests/support/db';
import { createSupabaseRepository } from './supabase-repository';

const db = serviceDb();
const repo = createSupabaseRepository(db);
const MOVIE = 900001;
const PROVIDER = 900001;
const GENRE = 900001;

async function cleanup() {
  await db.from('movies').delete().eq('id', MOVIE);
  await db.from('providers').delete().eq('id', PROVIDER);
  await db.from('genres').delete().eq('id', GENRE);
}

beforeAll(cleanup);
afterAll(cleanup);

const movieRow = {
  id: MOVIE,
  title: 'Filme de Teste',
  original_title: 'Test Movie',
  overview: null,
  release_date: '2020-05-01',
  vote_average: 7.25,
  vote_count: 10,
  popularity: 1,
  original_language: 'en',
  poster_path: null,
  backdrop_path: null,
};

describe('createSupabaseRepository', () => {
  it('grava, atualiza detalhes sem perder dados e remove ligações antigas', async () => {
    await repo.upsertProviders([{ id: PROVIDER, name: 'Teste', logo_path: null, display_priority: 1 }]);
    await repo.upsertGenres([{ id: GENRE, name: 'Gênero Teste' }]);
    await repo.upsertMovies([movieRow]);
    expect(await repo.existingMovieIds([MOVIE, MOVIE + 1])).toEqual(new Set([MOVIE]));

    await repo.upsertMovieGenres([{ movie_id: MOVIE, genre_id: GENRE }]);
    await repo.upsertMovieGenres([{ movie_id: MOVIE, genre_id: GENRE }]);

    await repo.touchMovieProviders(
      [{ movie_id: MOVIE, provider_id: PROVIDER, access_type: 'flatrate' }],
      '2026-01-01T00:00:00.000Z',
    );

    expect(await repo.listMoviesNeedingDetails('2026-01-01T00:00:00.000Z')).toContain(MOVIE);
    await repo.updateMovieDetails(MOVIE, {
      runtime: 100,
      backdrop_path: '/b.jpg',
      trailer_key: 'k',
      details_synced_at: '2026-01-02T00:00:00.000Z',
    });
    expect(await repo.listMoviesNeedingDetails('2026-01-01T00:00:00.000Z')).not.toContain(MOVIE);

    await repo.upsertMovies([{ ...movieRow, title: 'Novo Título', backdrop_path: '/b.jpg' }]);
    const { data } = await db.from('movies').select('title, runtime, trailer_key, vote_average').eq('id', MOVIE).single();
    expect(data).toEqual({ title: 'Novo Título', runtime: 100, trailer_key: 'k', vote_average: 7.3 });

    expect(await repo.deleteStaleMovieProviders('2026-01-01T00:00:00.000Z')).toBe(0);
    expect(await repo.deleteStaleMovieProviders('2026-01-01T00:00:01.000Z')).toBe(1);
  });
});
```

(As ligações dos dados de exemplo têm `last_seen_at` = hora do `db reset`, bem depois de 2026-01-01, então não são apagadas.)

- [ ] **Step 2: Rodar e ver falhar**

Run: `npx vitest run --project integration sync/supabase-repository.int.test.ts`
Expected: FAIL, "Failed to resolve import ./supabase-repository"

- [ ] **Step 3: Implementar** — `sync/supabase-repository.ts`

```ts
import type { PostgrestError, SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import type { CatalogRepository } from './repository';

const PAGE = 1000;

function check(error: PostgrestError | null, what: string) {
  if (error) throw new Error(`${what}: ${error.message}`);
}

export function createSupabaseRepository(db: SupabaseClient<Database>): CatalogRepository {
  return {
    async upsertProviders(rows) {
      const { error } = await db.from('providers').upsert(rows);
      check(error, 'upsert providers');
    },

    async upsertGenres(rows) {
      const { error } = await db.from('genres').upsert(rows);
      check(error, 'upsert genres');
    },

    async existingMovieIds(ids) {
      const { data, error } = await db.from('movies').select('id').in('id', ids);
      check(error, 'existingMovieIds');
      return new Set((data ?? []).map((row) => row.id));
    },

    async upsertMovies(rows) {
      // O upsert só atualiza as colunas enviadas: runtime, trailer_key etc. não são apagados.
      const { error } = await db.from('movies').upsert(rows);
      check(error, 'upsert movies');
    },

    async upsertMovieGenres(rows) {
      if (rows.length === 0) return;
      const { error } = await db
        .from('movie_genres')
        .upsert(rows, { onConflict: 'movie_id,genre_id', ignoreDuplicates: true });
      check(error, 'upsert movie_genres');
    },

    async touchMovieProviders(rows, seenAt) {
      const { error } = await db
        .from('movie_providers')
        .upsert(
          rows.map((row) => ({ ...row, last_seen_at: seenAt })),
          { onConflict: 'movie_id,provider_id,access_type' },
        );
      check(error, 'upsert movie_providers');
    },

    async listMoviesNeedingDetails(staleBefore) {
      const ids: number[] = [];
      for (let from = 0; ; from += PAGE) {
        const { data, error } = await db
          .from('movies')
          .select('id')
          .or(`details_synced_at.is.null,details_synced_at.lt."${staleBefore}"`)
          .order('id')
          .range(from, from + PAGE - 1);
        check(error, 'listMoviesNeedingDetails');
        ids.push(...(data ?? []).map((row) => row.id));
        if (!data || data.length < PAGE) return ids;
      }
    },

    async updateMovieDetails(id, update) {
      const { error } = await db.from('movies').update(update).eq('id', id);
      check(error, `updateMovieDetails(${id})`);
    },

    async deleteStaleMovieProviders(before) {
      const { count, error } = await db
        .from('movie_providers')
        .delete({ count: 'exact' })
        .lt('last_seen_at', before);
      check(error, 'deleteStaleMovieProviders');
      return count ?? 0;
    },
  };
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:int && npm run typecheck`
Expected: PASS

- [ ] **Step 5: Criar `sync/main.ts`**

```ts
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import { createSupabaseRepository } from './supabase-repository';
import { runSync } from './sync';
import { createTmdbClient } from './tmdb';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não definida`);
  return value;
}

async function main() {
  const started = Date.now();
  const db = createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  await runSync({
    tmdb: createTmdbClient({ token: env('TMDB_API_TOKEN') }),
    repo: createSupabaseRepository(db),
    log: (msg) => console.log(`[sync] ${msg}`),
  });
  console.log(`[sync] concluído em ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((error: unknown) => {
  console.error('[sync] falhou:', error);
  process.exit(1);
});
```

```bash
npm pkg set scripts.sync="node --env-file-if-exists=.env.local --import tsx sync/main.ts"
```

- [ ] **Step 6: Rodar de verdade contra o Supabase local** (precisa do `TMDB_API_TOKEN` no `.env.local`)

Run: `npm run sync`
Expected: linhas `[sync] ...` com streamings e gêneros, depois o resumo com centenas ou milhares de filmes adicionados. A primeira execução completa pode levar de 20 a 60 minutos por causa dos detalhes. Se quiser parar antes com Ctrl+C, tudo bem: a limpeza não roda e nada é apagado.

Depois, restaure os dados de exemplo para os testes: `npx supabase db reset`

- [ ] **Step 7: Commit**

```bash
git add sync/supabase-repository.ts sync/supabase-repository.int.test.ts sync/main.ts package.json
git commit -m "feat(sync): repositório Supabase e comando npm run sync"
```

---

### Task 10: Casca do site — layout, tema, 404, erro, /sobre e Playwright

**Files:**
- Modify: `src/app/layout.tsx`, `src/app/globals.css` (sobrescrever)
- Create: `src/app/not-found.tsx`, `src/app/error.tsx`, `src/app/sobre/page.tsx`, `playwright.config.ts`, `e2e/shell.spec.ts`
- Delete: arquivos de exemplo em `public/` (`*.svg`)

**Interfaces:**
- Produces: tokens de tema do Tailwind `bg`, `fg`, `surface`, `surface-2`, `border`, `muted`, `accent` (classes como `bg-surface`, `text-muted`, `ring-accent`); Playwright com `baseURL` `http://localhost:3100`.

- [ ] **Step 1: Configurar o Playwright** — `playwright.config.ts`

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'e2e',
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: 'http://localhost:3100', trace: 'on-first-retry' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'npm run build && npm run start -- -p 3100',
    url: 'http://localhost:3100',
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
```

```bash
npx playwright install chromium
```

Acrescente ao `.gitignore`:

```
/test-results/
/playwright-report/
```

- [ ] **Step 2: Escrever o teste que falha** — `e2e/shell.spec.ts`

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

test('cabeçalho leva ao catálogo', async ({ page }) => {
  await page.goto('/sobre');
  await page.getByRole('link', { name: '🎬 Catálogo' }).click();
  await expect(page).toHaveURL('/');
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `npm run test:e2e -- e2e/shell.spec.ts`
Expected: FAIL (a página `/sobre` e os textos ainda não existem)

- [ ] **Step 4: Implementar**

`src/app/globals.css`:

```css
@import "tailwindcss";

@theme {
  --color-bg: #0f1115;
  --color-fg: #e8e8ea;
  --color-surface: #1c1f26;
  --color-surface-2: #161920;
  --color-border: #2c313b;
  --color-muted: #8a8f99;
  --color-accent: #f5c518;
}

html {
  color-scheme: dark;
}
```

`src/app/layout.tsx`:

```tsx
import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Catálogo — o que tem nos streamings', template: '%s · Catálogo' },
  description: 'Descubra quais filmes estão disponíveis agora nos streamings do Brasil e como assistir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg text-fg antialiased">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-extrabold text-accent">
            🎬 Catálogo
          </Link>
          <span className="text-sm text-muted">Brasil</span>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted">
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

`src/app/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-lg">Não encontramos essa página.</p>
      <Link href="/" className="mt-4 inline-block text-accent underline">
        Voltar ao catálogo
      </Link>
    </main>
  );
}
```

`src/app/error.tsx`:

```tsx
'use client';

export default function ErrorPage({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-lg">Não conseguimos carregar o catálogo agora.</p>
      <button
        type="button"
        onClick={reset}
        className="mt-4 rounded-md bg-accent px-4 py-2 font-semibold text-black"
      >
        Tentar de novo
      </button>
    </main>
  );
}
```

`src/app/sobre/page.tsx`:

```tsx
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sobre' };

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 leading-relaxed">
      <h1 className="text-2xl font-bold">Sobre</h1>
      <p>
        Este catálogo mostra quais filmes estão disponíveis agora nos streamings do Brasil, por assinatura,
        aluguel ou compra. Os dados são atualizados uma vez por dia.
      </p>
      <p>
        Dados de filmes fornecidos pelo{' '}
        <a href="https://www.themoviedb.org/" className="underline" target="_blank" rel="noreferrer">
          TMDB
        </a>
        . This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
      <p>
        Dados de disponibilidade nos streamings fornecidos pelo{' '}
        <a href="https://www.justwatch.com/br" className="underline" target="_blank" rel="noreferrer">
          JustWatch
        </a>
        .
      </p>
    </main>
  );
}
```

```bash
rm -f public/*.svg
```

- [ ] **Step 5: Rodar e ver passar**

Run: `npm run test:e2e -- e2e/shell.spec.ts && npm run lint && npm run typecheck`
Expected: 3 testes PASS; lint e typecheck sem erros

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): layout, tema escuro, páginas de erro e /sobre"
```

---

### Task 11: Catálogo — grade, cards, "Carregar mais" e estado vazio

**Files:**
- Create: `src/lib/supabase/server.ts`, `src/app/actions.ts`, `src/components/ProviderLogo.tsx`, `src/components/catalog/MovieCard.tsx`, `src/components/catalog/MovieGrid.tsx`, `src/components/catalog/EmptyState.tsx`, `e2e/catalog.spec.ts`
- Modify: `src/app/page.tsx` (sobrescrever)

**Interfaces:**
- Consumes: `parseFilters`, `filtersToQuery`, `parseOffset`, `RawSearchParams` (Task 3); `searchMovies`, `PAGE_SIZE`, `listProviders`, `listGenres`, `MovieCardData`, `ProviderRef` (Task 4); `tmdbImage`, `formatYear`, `formatRuntime`, `formatRating` (Task 1).
- Produces:
  - `createServerSupabase(): Db`
  - Server Action `loadMoreMovies(query: string, offset: number): Promise<MovieCardData[]>`
  - `<ProviderLogo provider={ProviderRef} size={number} />` (imagem com `alt` e `title` = nome; sem logo, mostra as iniciais num quadrado com `title`)
  - `<MovieCard movie={MovieCardData} />` com `data-testid="movie-card"`, link para `/filme/{id}`
  - `<MovieGrid initialMovies total query />`, que guarda `query` em `sessionStorage['catalog-query']`
  - `<EmptyState />`
  - `src/app/page.tsx` renderiza `<CatalogControls>` e `<SortSelect>` **na Task 12**; nesta task a página mostra só o total e a grade.

- [ ] **Step 1: Escrever o teste que falha** — `e2e/catalog.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('mostra os primeiros 24 filmes e carrega o resto', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('38 filmes')).toBeVisible();
  const cards = page.getByTestId('movie-card');
  await expect(cards).toHaveCount(24);
  await expect(cards.first()).toContainText('Mad Max: Estrada da Fúria');
  await expect(cards.first()).toContainText('2015 · 2h');
  await expect(cards.first()).toContainText('★ 7.6');

  await page.getByRole('button', { name: 'Carregar mais' }).click();
  await expect(cards).toHaveCount(38);
  await expect(page.getByRole('button', { name: 'Carregar mais' })).toHaveCount(0);
});

test('filtro sem resultado mostra estado vazio e limpa', async ({ page }) => {
  await page.goto('/?idioma=zz');
  await expect(page.getByText('Nenhum filme encontrado')).toBeVisible();
  await page.getByRole('link', { name: 'Limpar filtros' }).click();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('parâmetro inválido é ignorado', async ({ page }) => {
  await page.goto('/?nota=abc&ordem=xyz');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('card leva à página do filme', async ({ page }) => {
  await page.goto('/');
  await page.getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:e2e -- e2e/catalog.spec.ts`
Expected: FAIL (a página ainda é o exemplo do create-next-app)

- [ ] **Step 3: Implementar**

`src/lib/supabase/server.ts`:

```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Db } from '@/lib/queries/types';
import type { Database } from './database.types';

export function createServerSupabase(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
```

`src/app/actions.ts`:

```ts
'use server';

import { parseFilters, parseOffset } from '@/lib/filters';
import { searchMovies } from '@/lib/queries/searchMovies';
import type { MovieCardData } from '@/lib/queries/types';
import { createServerSupabase } from '@/lib/supabase/server';

// Server Actions são endpoints públicos: revalidamos tudo o que chega.
export async function loadMoreMovies(query: string, offset: number): Promise<MovieCardData[]> {
  const filters = parseFilters(Object.fromEntries(new URLSearchParams(typeof query === 'string' ? query : '')));
  const { movies } = await searchMovies(createServerSupabase(), filters, parseOffset(offset));
  return movies;
}
```

`src/components/ProviderLogo.tsx`:

```tsx
import Image from 'next/image';
import type { ProviderRef } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';

export function ProviderLogo({ provider, size }: { provider: ProviderRef; size: number }) {
  const src = tmdbImage(provider.logoPath, 'w92');
  if (!src) {
    return (
      <span
        title={provider.name}
        style={{ width: size, height: size }}
        className="inline-flex items-center justify-center rounded bg-surface text-[10px] font-semibold text-muted"
      >
        {provider.name.slice(0, 2)}
      </span>
    );
  }
  return (
    <Image src={src} alt={provider.name} title={provider.name} width={size} height={size} className="rounded" />
  );
}
```

`src/components/catalog/MovieCard.tsx`:

```tsx
import Image from 'next/image';
import Link from 'next/link';
import { ProviderLogo } from '@/components/ProviderLogo';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import type { MovieCardData } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';

export function MovieCard({ movie }: { movie: MovieCardData }) {
  const poster = tmdbImage(movie.posterPath, 'w342');
  const meta = [formatYear(movie.releaseDate), formatRuntime(movie.runtime)].filter(Boolean).join(' · ');

  return (
    <Link href={`/filme/${movie.id}`} data-testid="movie-card" className="group block">
      <div className="relative aspect-[2/3] overflow-hidden rounded-md bg-surface">
        {poster && (
          <Image
            src={poster}
            alt={`Pôster de ${movie.title}`}
            fill
            sizes="(max-width: 640px) 50vw, 200px"
            className="object-cover transition group-hover:scale-105"
          />
        )}
        <span className="absolute left-1.5 top-1.5 rounded bg-black/70 px-1.5 py-0.5 text-xs font-bold text-accent">
          ★ {formatRating(movie.voteAverage)}
        </span>
      </div>
      <h3 className="mt-2 truncate text-sm font-semibold">{movie.title}</h3>
      {meta && <p className="text-xs text-muted">{meta}</p>}
      <div className="mt-1 flex gap-1">
        {movie.providers.slice(0, 4).map((p) => (
          <ProviderLogo key={p.id} provider={p} size={20} />
        ))}
      </div>
    </Link>
  );
}
```

`src/components/catalog/MovieGrid.tsx`:

```tsx
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
```

`src/components/catalog/EmptyState.tsx`:

```tsx
import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="text-lg">Nenhum filme encontrado</p>
      <p className="mt-1 text-sm text-muted">Tente tirar alguns filtros.</p>
      <Link href="/" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 font-semibold text-black">
        Limpar filtros
      </Link>
    </div>
  );
}
```

`src/app/page.tsx`:

```tsx
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
```

- [ ] **Step 4: Rodar e ver passar** (o Supabase local precisa estar rodando com os dados de exemplo: `npx supabase db reset`)

Run: `npm run test:e2e -- e2e/catalog.spec.ts && npm run lint && npm run typecheck`
Expected: 4 testes PASS. O teste do card leva a `/filme/1`, que por enquanto mostra a página 404 geral; a URL confere, então o teste passa.

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat(web): grade do catálogo com Carregar mais e estado vazio"
```

---

### Task 12: Catálogo — streamings, tipo de acesso, gaveta de filtros e ordenação

**Files:**
- Create: `src/components/catalog/useFilterNavigation.ts`, `ProviderPicker.tsx`, `AccessTypeChips.tsx`, `FiltersDrawer.tsx`, `SortSelect.tsx`, `CatalogControls.tsx` (todos em `src/components/catalog/`), `e2e/filters.spec.ts`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `CatalogFilters`, `filtersToQuery`, `countExtraFilters`, `toggle`, `ACCESS_TYPES`, `ACCESS_LABELS`, `SORT_KEYS`, `SORT_LABELS`, `AccessType`, `SortKey` (Task 3); `ProviderRef`, `GenreRef`, `listProviders`, `listGenres` (Task 4); `ProviderLogo` (Task 11).
- Produces: `useFilterNavigation(filters: CatalogFilters): (patch: Partial<CatalogFilters>) => void`; componentes `<CatalogControls filters providers genres />` e `<SortSelect filters />`. Botões de streaming têm `aria-label` = nome e `aria-pressed`; chips de acesso têm `aria-pressed`; a gaveta é um `role="dialog"` com rótulo "Mais filtros".

- [ ] **Step 1: Escrever o teste que falha** — `e2e/filters.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('marcar Netflix filtra e atualiza a URL', async ({ page }) => {
  await page.goto('/');
  const netflix = page.getByRole('button', { name: 'Netflix', exact: true });
  await netflix.click();
  await expect(page).toHaveURL('/?streaming=8');
  await expect(netflix).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);

  await page.goBack();
  await expect(page).toHaveURL('/');
  await expect(page.getByText('38 filmes')).toBeVisible();
});

test('tipo de acesso Compra', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Compra' }).click();
  await expect(page).toHaveURL('/?acesso=buy');
  await expect(page.getByTestId('movie-card')).toHaveCount(3);
});

test('gaveta Mais filtros aplica idioma e gênero', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Mais filtros' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByLabel('Idioma').selectOption('pt');
  await drawer.getByRole('button', { name: 'Thriller' }).click();
  await drawer.getByRole('button', { name: 'Aplicar' }).click();

  await expect(page).toHaveURL('/?genero=53&idioma=pt');
  await expect(page.getByTestId('movie-card')).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Mais filtros (2)' })).toBeVisible();
});

test('gaveta: Limpar zera os filtros da gaveta', async ({ page }) => {
  await page.goto('/?streaming=8&nota=8');
  await page.getByRole('button', { name: 'Mais filtros (1)' }).click();
  const drawer = page.getByRole('dialog', { name: 'Mais filtros' });
  await drawer.getByRole('button', { name: 'Limpar' }).click();
  await drawer.getByRole('button', { name: 'Aplicar' }).click();
  await expect(page).toHaveURL('/?streaming=8');
});

test('ordenar por A–Z', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Ordenar por').selectOption('az');
  await expect(page).toHaveURL('/?ordem=az');
  await expect(page.getByTestId('movie-card').first()).toContainText('Bacurau');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:e2e -- e2e/filters.spec.ts`
Expected: FAIL (não existem botões de streaming nem gaveta)

- [ ] **Step 3: Implementar**

`src/components/catalog/useFilterNavigation.ts`:

```ts
'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { filtersToQuery, type CatalogFilters } from '@/lib/filters';

export function useFilterNavigation(filters: CatalogFilters) {
  const router = useRouter();
  return useCallback(
    (patch: Partial<CatalogFilters>) => {
      const query = filtersToQuery({ ...filters, ...patch });
      router.push(query ? `/?${query}` : '/', { scroll: false });
    },
    [filters, router],
  );
}
```

`src/components/catalog/ProviderPicker.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { ProviderLogo } from '@/components/ProviderLogo';
import { toggle } from '@/lib/filters';
import type { ProviderRef } from '@/lib/queries/types';

const VISIBLE = 8;

interface Props {
  providers: ProviderRef[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function ProviderPicker({ providers, selected, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? providers : providers.filter((p, i) => i < VISIBLE || selected.includes(p.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((p) => {
        const on = selected.includes(p.id);
        const dim = selected.length > 0 && !on;
        return (
          <button
            key={p.id}
            type="button"
            aria-label={p.name}
            aria-pressed={on}
            title={p.name}
            onClick={() => onChange(toggle(selected, p.id))}
            className={`rounded-lg p-0.5 transition ${on ? 'ring-2 ring-accent' : ''} ${dim ? 'opacity-40 hover:opacity-80' : ''}`}
          >
            <ProviderLogo provider={p} size={44} />
          </button>
        );
      })}
      {providers.length > VISIBLE && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-muted underline">
          {showAll ? 'ver menos' : `ver todos (${providers.length})`}
        </button>
      )}
    </div>
  );
}
```

`src/components/catalog/AccessTypeChips.tsx`:

```tsx
'use client';

import { ACCESS_LABELS, ACCESS_TYPES, toggle, type AccessType } from '@/lib/filters';

interface Props {
  selected: AccessType[];
  onChange: (access: AccessType[]) => void;
}

export function AccessTypeChips({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCESS_TYPES.map((type) => {
        const on = selected.includes(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(toggle(selected, type))}
            className={`rounded-full border px-3 py-1 text-sm ${
              on ? 'border-accent bg-accent font-semibold text-black' : 'border-border bg-surface'
            }`}
          >
            {ACCESS_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
```

`src/components/catalog/FiltersDrawer.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { toggle, type CatalogFilters } from '@/lib/filters';
import type { GenreRef } from '@/lib/queries/types';

const LANGUAGES: [string, string][] = [
  ['en', 'Inglês'],
  ['pt', 'Português'],
  ['es', 'Espanhol'],
  ['fr', 'Francês'],
  ['it', 'Italiano'],
  ['de', 'Alemão'],
  ['ja', 'Japonês'],
  ['ko', 'Coreano'],
];

type Extra = Pick<CatalogFilters, 'genres' | 'yearMin' | 'yearMax' | 'minRating' | 'maxRuntime' | 'language'>;

const EMPTY: Extra = { genres: [], yearMin: null, yearMax: null, minRating: null, maxRuntime: null, language: null };

interface Props {
  open: boolean;
  filters: CatalogFilters;
  genres: GenreRef[];
  onClose: () => void;
  onApply: (patch: Extra) => void;
}

export function FiltersDrawer({ open, ...props }: Props) {
  // Montar só quando abre faz o rascunho recomeçar dos filtros atuais a cada abertura.
  return open ? <DrawerBody {...props} /> : null;
}

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

function DrawerBody({ filters, genres, onClose, onApply }: Omit<Props, 'open'>) {
  const [draft, setDraft] = useState<Extra>({
    genres: filters.genres,
    yearMin: filters.yearMin,
    yearMax: filters.yearMax,
    minRating: filters.minRating,
    maxRuntime: filters.maxRuntime,
    language: filters.language,
  });
  const set = (patch: Partial<Extra>) => setDraft((d) => ({ ...d, ...patch }));
  const field = 'mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5';

  return (
    <div
      className="fixed inset-0 z-50 flex justify-end bg-black/60"
      onClick={onClose}
      onKeyDown={(e) => e.key === 'Escape' && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Mais filtros"
        className="h-full w-full space-y-5 overflow-y-auto bg-surface-2 p-5 sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mais filtros</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted underline">
            Fechar
          </button>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Gênero</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {genres.map((g) => {
              const on = draft.genres.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ genres: toggle(draft.genres, g.id) })}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    on ? 'border-accent bg-accent font-semibold text-black' : 'border-border bg-surface'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Ano (de)
            <input
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              value={draft.yearMin ?? ''}
              onChange={(e) => set({ yearMin: numberOrNull(e.target.value) })}
              className={field}
            />
          </label>
          <label className="text-sm">
            Ano (até)
            <input
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              value={draft.yearMax ?? ''}
              onChange={(e) => set({ yearMax: numberOrNull(e.target.value) })}
              className={field}
            />
          </label>
        </div>

        <label className="block text-sm">
          Nota mínima
          <select
            value={draft.minRating ?? ''}
            onChange={(e) => set({ minRating: numberOrNull(e.target.value) })}
            className={field}
          >
            <option value="">Qualquer</option>
            <option value="6">★ 6+</option>
            <option value="7">★ 7+</option>
            <option value="8">★ 8+</option>
          </select>
        </label>

        <label className="block text-sm">
          Duração máxima
          <select
            value={draft.maxRuntime ?? ''}
            onChange={(e) => set({ maxRuntime: numberOrNull(e.target.value) })}
            className={field}
          >
            <option value="">Qualquer</option>
            <option value="90">Até 1h30</option>
            <option value="120">Até 2h</option>
            <option value="150">Até 2h30</option>
          </select>
        </label>

        <label className="block text-sm">
          Idioma
          <select
            value={draft.language ?? ''}
            onChange={(e) => set({ language: e.target.value || null })}
            className={field}
          >
            <option value="">Qualquer</option>
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setDraft(EMPTY)}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={() => onApply(draft)}
            className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
```

Se o lint reclamar de `onClick`/`onKeyDown` num `div` (regras jsx-a11y), mantenha: o fechamento pelo fundo é um atalho extra, e o botão "Fechar" é o caminho acessível.

`src/components/catalog/SortSelect.tsx`:

```tsx
'use client';

import { SORT_KEYS, SORT_LABELS, type CatalogFilters, type SortKey } from '@/lib/filters';
import { useFilterNavigation } from './useFilterNavigation';

export function SortSelect({ filters }: { filters: CatalogFilters }) {
  const navigate = useFilterNavigation(filters);
  return (
    <label className="flex items-center gap-2">
      Ordenar por
      <select
        value={filters.sort}
        onChange={(e) => navigate({ sort: e.target.value as SortKey })}
        className="rounded-md border border-border bg-surface px-2 py-1 text-fg"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
```

`src/components/catalog/CatalogControls.tsx`:

```tsx
'use client';

import { useState } from 'react';
import { countExtraFilters, type CatalogFilters } from '@/lib/filters';
import type { GenreRef, ProviderRef } from '@/lib/queries/types';
import { AccessTypeChips } from './AccessTypeChips';
import { FiltersDrawer } from './FiltersDrawer';
import { ProviderPicker } from './ProviderPicker';
import { useFilterNavigation } from './useFilterNavigation';

interface Props {
  filters: CatalogFilters;
  providers: ProviderRef[];
  genres: GenreRef[];
}

export function CatalogControls({ filters, providers, genres }: Props) {
  const navigate = useFilterNavigation(filters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const extra = countExtraFilters(filters);

  return (
    <section className="space-y-3">
      <ProviderPicker providers={providers} selected={filters.providers} onChange={(ids) => navigate({ providers: ids })} />
      <div className="flex flex-wrap items-center gap-2">
        <AccessTypeChips selected={filters.access} onChange={(access) => navigate({ access })} />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
        >
          ⚙ Mais filtros{extra > 0 ? ` (${extra})` : ''}
        </button>
      </div>
      <FiltersDrawer
        open={drawerOpen}
        filters={filters}
        genres={genres}
        onClose={() => setDrawerOpen(false)}
        onApply={(patch) => {
          setDrawerOpen(false);
          navigate(patch);
        }}
      />
    </section>
  );
}
```

O nome acessível do botão é "⚙ Mais filtros (2)". Se o teste com `{ name: 'Mais filtros (2)' }` não encontrar o botão por causa do ⚙, envolva o ícone em `<span aria-hidden="true">⚙</span> `.

`src/app/page.tsx` (substituir o conteúdo):

```tsx
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
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:e2e && npm run lint && npm run typecheck`
Expected: todos os testes e2e PASS (shell, catalog, filters)

- [ ] **Step 5: Conferir no celular**

Run: `npm run dev`, abra http://localhost:3000 com o DevTools em modo celular (375px). Confira: logos quebram linha sem rolagem lateral, a gaveta ocupa a tela toda e a grade tem 2 colunas.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): filtros de streaming, acesso, gaveta e ordenação"
```

---

### Task 13: Página do filme

**Files:**
- Create: `src/app/filme/[id]/page.tsx`, `src/app/filme/[id]/not-found.tsx`, `src/components/movie/MovieHero.tsx`, `WhereToWatch.tsx`, `TrailerModal.tsx`, `BackLink.tsx` (em `src/components/movie/`), `e2e/movie.spec.ts`

**Interfaces:**
- Consumes: `getMovie`, `MovieDetails` (Tasks 4–5); `parseMovieId`, `ACCESS_TYPES`, `ACCESS_LABELS` (Task 3); `createServerSupabase` (Task 11); `CATALOG_QUERY_KEY` (Task 11); `ProviderLogo` (Task 11); formatação e `tmdbImage` (Task 1).
- Produces: rota `/filme/[id]`; grupos de "onde assistir" com `data-testid="watch-flatrate" | "watch-rent" | "watch-buy"`.

- [ ] **Step 1: Escrever o teste que falha** — `e2e/movie.spec.ts`

```ts
import { expect, test } from '@playwright/test';

test('mostra detalhes, onde assistir e trailer', async ({ page }) => {
  await page.goto('/filme/1');
  await expect(page.getByRole('heading', { level: 1, name: 'Corra!' })).toBeVisible();
  await expect(page.getByText('2017 · 1h44 · Terror, Thriller')).toBeVisible();
  await expect(page.getByTestId('watch-flatrate').getByTitle('Netflix')).toBeVisible();
  await expect(page.getByTestId('watch-rent').getByTitle('Amazon Prime Video')).toBeVisible();
  await expect(page.getByTestId('watch-buy').getByTitle('Amazon Prime Video')).toBeVisible();
  await expect(page.getByText('Dados de disponibilidade:')).toBeVisible();
  await expect(page).toHaveTitle(/Corra! \(2017\)/);

  await page.getByRole('button', { name: 'Ver trailer' }).click();
  await expect(page.locator('iframe[src*="youtube-nocookie.com/embed/sRfnevzM9kQ"]')).toBeAttached();
  await page.keyboard.press('Escape');
  await expect(page.locator('iframe')).toHaveCount(0);
});

test('filme sem trailer não mostra o botão', async ({ page }) => {
  await page.goto('/filme/2');
  await expect(page.getByRole('heading', { level: 1, name: 'Hereditário' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Ver trailer' })).toHaveCount(0);
});

test('filme fora de streaming e id inválido mostram não encontrado', async ({ page }) => {
  await page.goto('/filme/9');
  await expect(page.getByText('Filme não encontrado')).toBeVisible();
  await page.goto('/filme/abc');
  await expect(page.getByText('Filme não encontrado')).toBeVisible();
});

test('voltar ao catálogo mantém os filtros', async ({ page }) => {
  await page.goto('/?streaming=8');
  await page.getByTestId('movie-card').filter({ hasText: 'Corra!' }).click();
  await expect(page).toHaveURL('/filme/1');
  await page.getByRole('link', { name: '← Voltar ao catálogo' }).click();
  await expect(page).toHaveURL('/?streaming=8');
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm run test:e2e -- e2e/movie.spec.ts`
Expected: FAIL (a rota `/filme/[id]` não existe)

- [ ] **Step 3: Implementar**

`src/components/movie/BackLink.tsx`:

```tsx
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATALOG_QUERY_KEY } from '@/components/catalog/MovieGrid';

function savedQuery(): string {
  try {
    return sessionStorage.getItem(CATALOG_QUERY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/"
      onClick={(e) => {
        const query = savedQuery();
        if (query) {
          e.preventDefault();
          router.push(`/?${query}`);
        }
      }}
      className="text-sm text-muted hover:text-fg"
    >
      ← Voltar ao catálogo
    </Link>
  );
}
```

`src/components/movie/TrailerModal.tsx`:

```tsx
'use client';

import { useEffect, useState } from 'react';

export function TrailerModal({ trailerKey, title }: { trailerKey: string; title: string }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-4 rounded-md bg-accent px-4 py-2 font-bold text-black"
      >
        ▶ Ver trailer
      </button>
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Trailer de ${title}`}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setOpen(false)}
        >
          <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-2 text-right">
              <button type="button" onClick={() => setOpen(false)} className="text-sm underline">
                Fechar ✕
              </button>
            </div>
            <div className="aspect-video">
              <iframe
                className="h-full w-full rounded-lg"
                src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}?autoplay=1`}
                title={`Trailer de ${title}`}
                allow="autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
```

Se o nome acessível "▶ Ver trailer" não casar com `{ name: 'Ver trailer' }`, envolva o ícone em `<span aria-hidden="true">▶</span> `. O Playwright casa por substring por padrão, então deve passar como está.

`src/components/movie/WhereToWatch.tsx`:

```tsx
import { ProviderLogo } from '@/components/ProviderLogo';
import { ACCESS_LABELS, ACCESS_TYPES } from '@/lib/filters';
import type { MovieDetails } from '@/lib/queries/types';

export function WhereToWatch({ watch }: { watch: MovieDetails['watch'] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10" aria-labelledby="onde-assistir">
      <h2 id="onde-assistir" className="text-xs font-semibold uppercase tracking-wider text-muted">
        Onde assistir no Brasil
      </h2>
      <dl className="mt-3 space-y-3">
        {ACCESS_TYPES.filter((type) => watch[type].length > 0).map((type) => (
          <div key={type} data-testid={`watch-${type}`} className="flex items-center gap-3">
            <dt className="w-24 text-sm text-muted">{ACCESS_LABELS[type]}</dt>
            <dd className="flex flex-wrap gap-2">
              {watch[type].map((p) => (
                <ProviderLogo key={p.id} provider={p} size={40} />
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

`src/components/movie/MovieHero.tsx`:

```tsx
import Image from 'next/image';
import { formatRating, formatRuntime, formatYear } from '@/lib/format';
import type { MovieDetails } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';
import { BackLink } from './BackLink';
import { TrailerModal } from './TrailerModal';

export function MovieHero({ movie }: { movie: MovieDetails }) {
  const backdrop = tmdbImage(movie.backdropPath, 'w1280');
  const poster = tmdbImage(movie.posterPath, 'w500');
  const meta = [formatYear(movie.releaseDate), formatRuntime(movie.runtime), movie.genres.join(', ')]
    .filter(Boolean)
    .join(' · ');

  return (
    <section className="relative isolate">
      {backdrop && (
        <div className="absolute inset-0 -z-10">
          <Image src={backdrop} alt="" fill priority className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-linear-to-b from-bg/30 via-bg/70 to-bg" />
        </div>
      )}
      <div className="mx-auto max-w-6xl px-4 pb-6 pt-4">
        <BackLink />
        <div className="mt-10 flex flex-col gap-6 sm:flex-row sm:items-end">
          <div className="relative aspect-[2/3] w-40 shrink-0 overflow-hidden rounded-lg bg-surface shadow-2xl sm:w-56">
            {poster && <Image src={poster} alt={`Pôster de ${movie.title}`} fill className="object-cover" />}
          </div>
          <div className="max-w-2xl">
            <h1 className="text-3xl font-bold text-white">{movie.title}</h1>
            <p className="mt-1 text-sm text-muted">
              {meta && <span>{meta}</span>}
              {meta && ' · '}
              <span className="font-bold text-accent">★ {formatRating(movie.voteAverage)}</span>
            </p>
            {movie.overview && <p className="mt-3 leading-relaxed text-fg/90">{movie.overview}</p>}
            {movie.trailerKey && <TrailerModal trailerKey={movie.trailerKey} title={movie.title} />}
          </div>
        </div>
      </div>
    </section>
  );
}
```

`src/app/filme/[id]/page.tsx`:

```tsx
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { cache } from 'react';
import { MovieHero } from '@/components/movie/MovieHero';
import { WhereToWatch } from '@/components/movie/WhereToWatch';
import { parseMovieId } from '@/lib/filters';
import { formatYear } from '@/lib/format';
import { getMovie } from '@/lib/queries/getMovie';
import { createServerSupabase } from '@/lib/supabase/server';
import { tmdbImage } from '@/lib/tmdb-image';

type Props = { params: Promise<{ id: string }> };

// cache() evita consultar o banco duas vezes (metadados + página) na mesma requisição.
const loadMovie = cache(async (idParam: string) => {
  const id = parseMovieId(idParam);
  return id === null ? null : getMovie(createServerSupabase(), id);
});

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const movie = await loadMovie((await params).id);
  if (!movie) return { title: 'Filme não encontrado' };
  const year = formatYear(movie.releaseDate);
  const image = tmdbImage(movie.backdropPath, 'w780');
  return {
    title: `${movie.title}${year ? ` (${year})` : ''} — onde assistir`,
    description: movie.overview?.slice(0, 160) ?? undefined,
    openGraph: image ? { images: [image] } : undefined,
  };
}

export default async function MoviePage({ params }: Props) {
  const movie = await loadMovie((await params).id);
  if (!movie) notFound();
  return (
    <main>
      <MovieHero movie={movie} />
      <WhereToWatch watch={movie.watch} />
    </main>
  );
}
```

`src/app/filme/[id]/not-found.tsx`:

```tsx
import Link from 'next/link';

export default function MovieNotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-lg">Filme não encontrado.</p>
      <p className="mt-1 text-sm text-muted">Ele pode ter saído de todos os streamings.</p>
      <Link href="/" className="mt-4 inline-block text-accent underline">
        Voltar ao catálogo
      </Link>
    </main>
  );
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm run test:e2e && npm run lint && npm run typecheck`
Expected: todos os e2e PASS

- [ ] **Step 5: Conferir com dados reais** (opcional, mas recomendado)

Rode `npm run sync` por alguns minutos (Ctrl+C depois de alguns streamings), depois `npm run dev`. Abra alguns filmes e confira pôsteres, logos, imagem de fundo e trailer. Para os testes, volte aos dados de exemplo com `npx supabase db reset`.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat(web): página do filme com onde assistir e trailer"
```

---

### Task 14: GitHub Actions — CI e sincronização diária

**Files:**
- Create: `.github/workflows/ci.yml`, `.github/workflows/sync.yml`

**Interfaces:**
- Consumes: scripts `typecheck`, `lint`, `test:unit`, `test:int`, `test:e2e`, `env:local`, `sync`.
- Produces: CI a cada push; sincronização às 06:00 UTC (03:00 em Brasília) e pelo botão "Run workflow".

- [ ] **Step 1: Criar `.github/workflows/ci.yml`**

```yaml
name: CI

on:
  push:
  pull_request:

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 30
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - name: Subir Supabase local (aplica migrações e seed)
        run: npx supabase start
      - run: npm run env:local
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run test:int
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

- [ ] **Step 2: Criar `.github/workflows/sync.yml`**

```yaml
name: Sincronizar catálogo

on:
  schedule:
    - cron: '0 6 * * *' # 03:00 em Brasília
  workflow_dispatch:

concurrency:
  group: sync
  cancel-in-progress: false

jobs:
  sync:
    runs-on: ubuntu-latest
    timeout-minutes: 180
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 24
          cache: npm
      - run: npm ci
      - run: npm run sync
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_ROLE_KEY: ${{ secrets.SUPABASE_SERVICE_ROLE_KEY }}
          TMDB_API_TOKEN: ${{ secrets.TMDB_API_TOKEN }}
```

- [ ] **Step 3: Criar o repositório no GitHub e enviar** (manual)

1. Em https://github.com/new, crie um repositório (ex.: `catalogo-filmes`), **sem** README nem .gitignore.
2. No terminal:

```bash
git remote add origin https://github.com/<seu-usuario>/catalogo-filmes.git
git branch -M main
git add .github
git commit -m "ci: testes a cada push e sincronização diária"
git push -u origin main
```

Expected: na aba **Actions** do GitHub, o workflow **CI** roda e fica verde. O **Sincronizar catálogo** ainda não roda, porque faltam os segredos (Task 15).

---

### Task 15: Publicação — Supabase na nuvem, primeira sincronização e Vercel (manual)

**Files:** nenhum arquivo novo.

- [ ] **Step 1: Projeto Supabase.** Em https://supabase.com/dashboard, crie um projeto (região São Paulo, `sa-east-1`). Guarde a senha do banco.

- [ ] **Step 2: Aplicar as migrações no projeto da nuvem**

```bash
npx supabase login
npx supabase link --project-ref <ref-do-projeto>
npx supabase db push
```
Expected: "Finished supabase db push" com as duas migrações. **Não** rode o seed na nuvem.

- [ ] **Step 3: Segredos no GitHub.** Em Settings → Secrets and variables → Actions → New repository secret, crie:
  - `SUPABASE_URL`: Project URL (Supabase → Project Settings → API)
  - `SUPABASE_SERVICE_ROLE_KEY`: a chave `service_role` (secreta)
  - `TMDB_API_TOKEN`: o token da Task 0

- [ ] **Step 4: Primeira sincronização.** Em Actions → "Sincronizar catálogo" → Run workflow. Expected: termina verde em até ~1h, com o resumo no log. No Supabase → Table Editor, `movies` tem milhares de linhas.

- [ ] **Step 5: Vercel.** Em https://vercel.com/new, importe o repositório. Em Environment Variables, adicione `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` (a chave `anon` pública). Clique em Deploy.

- [ ] **Step 6: Verificar em produção.** No link da Vercel: o catálogo mostra filmes reais, a Netflix filtra, "Carregar mais" funciona, a página de um filme mostra onde assistir e o trailer, e `/sobre` tem os créditos. Compartilhe o link de um filme no WhatsApp e confira se a pré-visualização mostra a imagem.
