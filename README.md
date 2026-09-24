# Catálogo de filmes nos streamings do Brasil

Site que mostra quais filmes estão disponíveis agora nos streamings do Brasil (assinatura, aluguel ou
compra), com filtros por streaming, tipo de acesso, gênero, ano, nota, duração e idioma, e uma página
por filme com onde assistir e o trailer. Os dados vêm do TMDB e são atualizados uma vez por dia.

## Stack

- [Next.js](https://nextjs.org/) 16 (App Router) + React 19 + Tailwind CSS 4
- [Supabase](https://supabase.com/) (Postgres) para o catálogo
- API do [TMDB](https://www.themoviedb.org/) (disponibilidade via JustWatch)
- Vitest (unidade e integração) e Playwright (ponta a ponta)
- GitHub Actions (CI e sincronização diária) e Vercel (hospedagem)

## Arquitetura

1. **Sincronização** (`sync/`): um script Node que roda uma vez por dia no GitHub Actions, varre o
   TMDB por streaming e tipo de acesso e grava filmes, gêneros e ligações filme–streaming no Supabase.
   Ligações que não aparecem mais são removidas no fim (com uma trava contra remoções em massa).
2. **Banco** (`supabase/`): Postgres com leitura pública via RLS e a função `search_movies`, que
   aplica filtros, ordenação e paginação num único RPC.
3. **Site** (`src/`): Next.js lê o Supabase com a chave pública; os filtros ficam na URL, então
   qualquer busca pode ser compartilhada.

## Rodando localmente

Pré-requisitos: Node 24 e Docker Desktop (para o Supabase local).

```bash
npm install
npx supabase start          # sobe o Postgres local com as migrações e a seed
npm run env:local           # gera o .env.local com as chaves do Supabase local
```

Acrescente ao `.env.local` o seu token de leitura da API do TMDB (v4):

```
TMDB_API_TOKEN=seu-token
```

Depois:

```bash
npm run dev                 # http://localhost:3000
```

A seed já traz alguns filmes. Para trazer o catálogo real do TMDB:

```bash
npm run sync
```

## Testes

```bash
npm run test:unit           # unidade (sem banco)
npm run test:int            # integração (precisa do Supabase local)
npm run test:e2e            # Playwright: faz o build e sobe o site na porta 3100
npm run typecheck
npm run lint
```

## Deploy

1. **Supabase**: crie o projeto, vincule com `npx supabase link --project-ref <ref>` e aplique as
   migrações com `npx supabase db push`.
2. **GitHub**: em *Settings → Secrets and variables → Actions*, cadastre `SUPABASE_URL`,
   `SUPABASE_SERVICE_ROLE_KEY` e `TMDB_API_TOKEN`. O workflow *Sincronizar catálogo* roda todo dia às
   03:00 (Brasília) e também pode ser disparado à mão.
3. **Vercel**: importe o repositório e defina `NEXT_PUBLIC_SUPABASE_URL` e
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`. A versão do Node vem do campo `engines` do `package.json`.

> O GitHub desativa workflows agendados depois de 60 dias sem atividade no repositório. Se a
> sincronização parar, reative o workflow na aba *Actions* (ou faça qualquer commit).

## Créditos

Dados de filmes fornecidos pelo [TMDB](https://www.themoviedb.org/). This product uses the TMDB API
but is not endorsed or certified by TMDB.

Dados de disponibilidade nos streamings fornecidos pelo [JustWatch](https://www.justwatch.com/br).
