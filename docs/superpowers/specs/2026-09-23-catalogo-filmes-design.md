# Catálogo de Filmes nos Streamings (Brasil) — Design

**Data:** 2026-09-23
**Status:** aguardando revisão

## 1. Objetivo e contexto

Um site que mostra quais filmes estão disponíveis agora nos streamings do Brasil e como assistir cada um: assinatura, aluguel ou compra.

- **Para que serve agora:** projeto de portfólio e aprendizado. Tem que ser bom de mostrar, feito sem atalhos que atrapalhem crescer depois.
- **Futuro possível:** virar produto público. Por isso as decisões evitam becos sem saída; por exemplo, nenhuma chave secreta vai para o navegador.
- **Critério de sucesso da fase 1:** alguém abre o link, escolhe um ou mais streamings, refina com filtros, abre um filme e vê onde e como assisti-lo no Brasil, com dados de no máximo 1 dia atrás.

### Escopo

**Fase 1 (este documento):**
- Web responsiva, só Brasil (`watch_region=BR`), apenas navegação, sem login.
- Catálogo com filtros combinados: streaming, tipo de acesso, gênero, faixa de ano, nota mínima, duração máxima e idioma original.
- Tipos de acesso: assinatura (`flatrate`), aluguel (`rent`) e compra (`buy`).
- Página do filme: pôster, título, ano, sinopse, nota, duração, gêneros, onde assistir e trailer.

**Fase 2 (fora deste documento):** login e cadastro com Supabase Auth, favoritos e "já assisti".

**Fora do escopo:** busca por título, seções prontas na home, elenco, filmes parecidos, séries, outros países e app mobile nativo.

## 2. Decisões principais

| Decisão | Escolha | Motivo |
|---|---|---|
| Fonte de dados | API do TMDB (os dados de onde assistir vêm do JustWatch) | Tem streamings por região com tipo de acesso; é gratuita |
| Stack do site | Next.js (App Router) + TypeScript + Tailwind, publicado na Vercel | Páginas prontas no servidor (SEO e links compartilháveis), chave escondida no servidor, integração oficial com Supabase |
| Dados | Catálogo copiado para um banco Supabase (Postgres) | Filtros rápidos e completos; logos nos cards com uma consulta só; aprende Supabase já para a fase 2 |
| Sincronização | Script TypeScript rodado pelo GitHub Actions, 1 vez por dia de madrugada | Sem limite de tempo curto, grátis, histórico visível |
| Paginação | Botão "Carregar mais" (24 filmes por bloco) | Simples, sem prender o rodapé, mantém a posição ao voltar |
| Estado dos filtros | Na URL | Buscas compartilháveis; o botão voltar funciona |

## 3. Arquitetura

```
┌──────────────┐  1x/dia   ┌──────────────────────┐
│ GitHub       │ ────────▶ │  TMDB API            │
│ Actions      │  lê       │  (BR)                │
│ (sync/)      │ ◀──────── └──────────────────────┘
└──────┬───────┘
       │ grava (chave de serviço)
       ▼
┌──────────────┐  lê (chave pública)  ┌──────────────────────┐       ┌───────────┐
│  Supabase    │ ◀─────────────────── │  Next.js (Vercel)    │ ────▶ │ Navegador │
│  (Postgres)  │                      │  páginas no servidor │ HTML  └───────────┘
└──────────────┘                      └──────────────────────┘
```

Três partes, cada uma com uma função só:

1. **Sincronizador (`sync/`):** lê o TMDB e grava no Supabase. É a única parte que escreve no banco. Usa `TMDB_API_KEY` (ou token de leitura) e `SUPABASE_SERVICE_ROLE_KEY`, guardados nos segredos do GitHub.
2. **Banco (Supabase Postgres):** guarda filmes, gêneros, streamings e as ligações. O RLS (as regras de acesso do Supabase) fica ativo em todas as tabelas, com permissão só de leitura para a chave pública (`anon`).
3. **Site (Next.js):** só lê o banco. **Não chama o TMDB**, porque tudo o que precisa está no banco, inclusive a chave do trailer. As imagens vêm do CDN de imagens do TMDB (`image.tmdb.org`), configurado em `next.config` como domínio permitido.

**Repositório único:** o site fica na raiz, o sincronizador em `sync/` e as migrações em `supabase/migrations/`. Os tipos TypeScript das tabelas são gerados pela Supabase CLI (`supabase gen types`) e compartilhados entre o site e o sincronizador.

## 4. Modelo de dados

### `movies`
| Coluna | Tipo | Observação |
|---|---|---|
| `id` | `integer` PK | id do TMDB |
| `title` | `text` | título em pt-BR |
| `original_title` | `text` | |
| `overview` | `text` null | sinopse em pt-BR |
| `release_date` | `date` null | o filtro de ano usa esta coluna |
| `runtime` | `integer` null | minutos; vem de `/movie/{id}` |
| `vote_average` | `numeric(3,1)` | |
| `vote_count` | `integer` | |
| `popularity` | `numeric` | ordenação "populares agora" |
| `original_language` | `text` | código ISO 639-1 |
| `poster_path` | `text` null | |
| `backdrop_path` | `text` null | imagem de fundo da página do filme |
| `trailer_key` | `text` null | chave do vídeo no YouTube |
| `details_synced_at` | `timestamptz` null | última busca de `/movie/{id}` |

### `genres`
`id integer PK`, `name text` (pt-BR).

### `movie_genres`
`movie_id → movies.id`, `genre_id → genres.id`, PK composta.

### `providers`
`id integer PK` (id do TMDB), `name text`, `logo_path text`, `display_priority integer`.

### `movie_providers`
| Coluna | Tipo |
|---|---|
| `movie_id` | `integer` → `movies.id` |
| `provider_id` | `integer` → `providers.id` |
| `access_type` | enum `access_type` (`flatrate`, `rent`, `buy`) |
| `last_seen_at` | `timestamptz` |

PK composta: (`movie_id`, `provider_id`, `access_type`).

### Índices
- `movie_providers (provider_id, access_type)`
- `movies (popularity desc)`, `movies (vote_average desc)`, `movies (release_date desc)`
- `movie_genres (genre_id)`

### Visibilidade
O site só mostra filmes com pelo menos uma linha em `movie_providers`. Filmes sem ligação ficam no banco, mas não aparecem.

## 5. Sincronização

Rodada pelo GitHub Actions (`.github/workflows/sync.yml`), 1 vez por dia de madrugada no horário de Brasília (`cron: "0 6 * * *"` em UTC), e também manualmente (`workflow_dispatch`).

Passos, com `run_started_at = now()`:

1. **Referências:** atualiza `providers` (`/watch/providers/movie?watch_region=BR`) e `genres` (`/genre/movie/list?language=pt-BR`).
2. **Varredura:** para cada streaming e cada tipo de acesso, percorre `/discover/movie` com `watch_region=BR`, `with_watch_providers={id}`, `with_watch_monetization_types={tipo}` e `language=pt-BR`. Para cada filme, grava ou atualiza `movies` e `movie_genres`, e grava ou atualiza `movie_providers` com `last_seen_at = run_started_at`.
   - Se uma consulta tiver mais de 500 páginas (limite do TMDB), divide por faixas de `primary_release_date` até cada faixa caber no limite.
3. **Detalhes:** para filmes com `details_synced_at` vazio ou com mais de 30 dias, chama `/movie/{id}?language=pt-BR&append_to_response=videos` e grava `runtime`, `backdrop_path` e `trailer_key`. Para o trailer, prefere um vídeo do YouTube do tipo `Trailer` em pt-BR; se não houver, usa um em inglês (segunda chamada `videos` com `language=en-US`, só quando não houver em pt-BR).
4. **Limpeza:** **só se os passos 1–3 terminaram sem erro**, apaga as linhas de `movie_providers` com `last_seen_at < run_started_at`.
5. **Resumo:** mostra no log quantos filmes foram adicionados, atualizados e desvinculados.

**Limite de requisições:** no máximo cerca de 20 requisições por segundo. Nos erros 429 e 5xx, tenta de novo até 3 vezes com espera crescente (1s, 2s, 4s). Esgotadas as tentativas, a execução falha. Nesse caso a limpeza não roda e o GitHub avisa por e-mail.

**Estrutura para testes:** a lógica recebe um `TmdbClient` e um `CatalogRepository` como interfaces. Nos testes, entram versões falsas no lugar das reais.

## 6. Site

### Rotas
| Rota | Conteúdo |
|---|---|
| `/` | Catálogo |
| `/filme/[id]` | Página do filme; `generateMetadata` gera título, descrição e imagem de pré-visualização (Open Graph) |
| `/sobre` | Créditos obrigatórios ao TMDB ("This product uses the TMDB API but is not endorsed or certified by TMDB") e ao JustWatch |

### Parâmetros de URL do catálogo
| Parâmetro | Exemplo | Padrão |
|---|---|---|
| `streaming` | `8,119` (ids do TMDB) | todos |
| `acesso` | `flatrate,rent` | todos |
| `genero` | `27,53` | todos (um filme passa se tiver **qualquer** dos gêneros) |
| `ano_min`, `ano_max` | `2000`, `2026` | sem limite |
| `nota` | `7` | sem mínimo |
| `duracao_max` | `120` (minutos) | sem limite |
| `idioma` | `en` | qualquer |
| `ordem` | `populares` \| `nota` \| `recentes` \| `az` | `populares` |

Entre streamings e entre tipos de acesso, a regra também é "qualquer um": o filme passa se estiver em **algum** dos streamings marcados com **algum** dos tipos marcados. A ordem `nota` só considera filmes com `vote_count >= 50`, para evitar notas altas com pouquíssimos votos.

Os parâmetros são validados com Zod. Valores inválidos são ignorados, como se o parâmetro não existisse.

### Tela do catálogo (layout escolhido: "logos em destaque")
- Topo: nome do app.
- `ProviderPicker`: linha de logos grandes dos streamings, com seleção múltipla. Os streamings seguem `display_priority`; os menos relevantes ficam atrás de um "ver todos".
- `AccessTypeChips`: Assinatura / Aluguel / Compra.
- Botão "Mais filtros (n)" que abre o `FiltersDrawer`, com gênero, ano, nota, duração e idioma.
- Barra de resultados: total de filmes e o `SortSelect`.
- `MovieGrid` de `MovieCard`: pôster com a nota, título, ano · duração e logos pequenos dos streamings onde o filme está.
- Botão "Carregar mais": os primeiros 24 filmes são montados no servidor; os blocos seguintes vêm por uma Server Action com os mesmos filtros e o deslocamento.

### Página do filme (layout escolhido: "imagem de fundo em destaque")
- `MovieHero`: imagem de fundo com degradê, pôster, título, ano · duração · gêneros · nota, sinopse e o botão "Ver trailer".
- `WhereToWatch`: logos agrupados em Assinatura / Aluguel / Compra, com "Dados de disponibilidade: JustWatch" logo abaixo.
- `TrailerModal`: iframe do YouTube (`youtube-nocookie.com`), carregado só quando a pessoa clica.
- Link "← Voltar ao catálogo", que volta pelo histórico para manter os filtros.

### Camada de dados
Todas as consultas ficam em `lib/queries/` (por exemplo `searchMovies(filters, offset)`, `getMovie(id)`, `listProviders()`, `listGenres()`), usando o cliente Supabase do servidor. Os componentes não acessam o banco diretamente. Se a combinação de filtros ficar complexa demais para o construtor de consultas, a busca vira uma função Postgres (`search_movies`) chamada via RPC.

### Visual
Tema escuro com amarelo como cor de destaque, layout responsivo pensado primeiro para o celular. No celular, a gaveta de filtros ocupa a tela inteira.

## 7. Erros e casos vazios

**Site**
- Nenhum resultado: mensagem "Nenhum filme encontrado" e botão "Limpar filtros".
- Parâmetro inválido: ignorado.
- `/filme/[id]` inexistente ou sem nenhum streaming: `notFound()` (página 404 com link de volta ao catálogo).
- Sem trailer: o botão "Ver trailer" não aparece. Sem pôster ou imagem de fundo: fundo neutro no lugar.
- Falha ao consultar o Supabase: `error.tsx` com "Não conseguimos carregar o catálogo agora" e botão "Tentar de novo".

**Sincronizador:** ver a seção 5 (novas tentativas, limpeza só se tudo deu certo, falha avisa por e-mail).

## 8. Testes

1. **Unitários (Vitest):**
   - Leitura e validação dos parâmetros de URL.
   - Sincronizador, com `TmdbClient` e `CatalogRepository` falsos: filme novo entra; filme que sumiu perde a ligação; falha no meio não apaga nada; nova tentativa depois de 429; divisão por faixas de ano acima de 500 páginas; escolha do trailer (pt-BR, depois en-US).
2. **Integração (Supabase local via Supabase CLI + Docker Desktop):**
   - As consultas de `lib/queries/` contra dados de exemplo (`supabase/seed.sql`): cada filtro e ordenação retorna os filmes certos, e filmes sem streaming não aparecem.
   - RLS: a chave `anon` consegue ler e não consegue escrever.
3. **Ponta a ponta (Playwright), poucos caminhos:**
   - Marcar um streaming → a grade e a URL mudam.
   - "Carregar mais" adiciona filmes.
   - Abrir um filme → "onde assistir" aparece → o trailer abre.
4. **CI (GitHub Actions, a cada push):** checagem de tipos, lint, testes unitários e de integração. O Playwright roda contra o preview da Vercel.

## 9. Configuração e segredos

| Variável | Onde fica | Usada por |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Vercel | site |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Vercel | site (só leitura, protegida pelo RLS) |
| `SUPABASE_URL` | GitHub Secrets | sincronizador |
| `SUPABASE_SERVICE_ROLE_KEY` | GitHub Secrets | sincronizador |
| `TMDB_API_TOKEN` | GitHub Secrets | sincronizador |

`.env.local` fica fora do git, e o `.env.example` mostra os nomes das variáveis.

## 10. Pré-requisitos

- Conta no TMDB, com token de leitura da API.
- Projeto Supabase (plano gratuito).
- Conta na Vercel, ligada ao repositório do GitHub.
- Docker Desktop e Supabase CLI instalados na máquina de desenvolvimento.
- Node.js LTS.
