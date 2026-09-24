# Vitrine estilo Netflix, busca e nova página do filme — Design

**Data:** 2026-09-23
**Status:** aguardando revisão
**Parte de:** fase 1 do catálogo (spec base: `2026-09-23-catalogo-filmes-design.md`). Esta spec **altera** a base nos pontos abaixo; o que não for mencionado continua valendo.

## 1. Objetivo

Dar ao site a sensação de "ambiente Netflix" com que o usuário já está acostumado: uma vitrine na entrada, com um filme em destaque e fileiras de pôsteres, busca por título no topo e uma página de filme no layout de referência do usuário. Tudo isso **sem perder** o catálogo com filtros, que continua existindo em outro endereço.

- **Sucesso:** quem abre o site vê na hora um filme em destaque e fileiras por streaming e por gênero. Consegue buscar um filme pelo nome. Do "Ver todos" de uma fileira, cai no catálogo já filtrado.
- **Referência visual:** os dois prints enviados pelo usuário, com a vitrine e a página do filme. Seguimos o clima deles, com estas diferenças de propósito:
  - Nada de "% relevante" nem "HD", porque não existem nos nossos dados.
  - Nada de "Mais informações", que duplicava "Ver detalhes".
  - Os logos dos streamings aparecem no lugar desses dados.
- **Marca:** seguimos o clima da Netflix, não a marca. O nome é "CineCatálogo" e não usamos o logo nem o nome da Netflix como identidade.

**Muda em relação à spec base:**
- **Busca por título:** estava fora do escopo e agora entra.
- **Seções prontas na home:** estavam fora do escopo e agora entram, como fileiras.
- **Catálogo com filtros:** sai de `/` e vai para `/catalogo`.
- **Página do filme:** ganha layout novo. O trailer fica embutido na página em vez de abrir num modal.
- **Tema:** a cor de destaque deixa de ser amarela e vira vermelha, com novas fontes.

**Continua fora do escopo:** busca instantânea com sugestões, carrossel automático no destaque, seções personalizadas (dependem do login da fase 2), séries.

## 2. Rotas e navegação

| Rota | Conteúdo | Situação |
|---|---|---|
| `/` | Vitrine: destaque + fileiras | nova |
| `/catalogo` | Catálogo com logos, filtros, ordenação e "Carregar mais" (o atual) | muda de endereço |
| `/busca?q=...` | Resultados da busca por título | nova |
| `/filme/[id]` | Página do filme | redesenhada |
| `/sobre` | Créditos | igual |

**Redirecionamento de links antigos.** Se `/` receber qualquer parâmetro do catálogo (`streaming`, `acesso`, `genero`, `ano_min`, `ano_max`, `nota`, `duracao_max`, `idioma`, `ordem`), redireciona para `/catalogo` com os mesmos parâmetros.

**Topo (em todas as páginas):**
- Logo "CineCatálogo" ("Cine" em branco, "Catálogo" em vermelho), que leva para `/`.
- Links "Início" (`/`) e "Catálogo" (`/catalogo`), com o link da página atual em destaque.
- À direita, o campo "Buscar filme…": um formulário GET para `/busca` com o parâmetro `q`.
- No celular (abaixo de 640px), o campo vira um botão de lupa que abre o campo ocupando a largura do topo.
- Na vitrine, o topo fica **transparente sobre o destaque**, com um degradê escuro para garantir a leitura. Depois de rolar cerca de 40px, ele ganha fundo sólido `#141414`. Nas outras páginas o fundo é sempre sólido.
- O topo fica fixo no alto da tela.

**Rodapé:** igual ao atual, com os créditos e o link para "Sobre".

## 3. Visual

**Cores (tokens do Tailwind em `globals.css`):**

| Token | Valor | Uso |
|---|---|---|
| `bg` | `#141414` | fundo |
| `fg` | `#ffffff` | texto principal |
| `surface` | `#1f1f1f` | pílulas, chips, campos |
| `surface-2` | `#181818` | painéis (gaveta de filtros) |
| `border` | `#2e2e2e` | bordas sutis |
| `muted` | `#a3a3a3` | texto secundário |
| `accent` | `#e0182d` | logo, barra vermelha dos títulos de seção, botões de ação do catálogo, anel de seleção |
| `star` | `#f5c518` | só a ★ da nota |

Todas as telas existentes (catálogo, gaveta, 404, erro, sobre) passam a usar a nova paleta automaticamente pelos tokens. Onde o amarelo era usado para "selecionado" (streamings, chips), passa a ser o vermelho.

**Tipografia (via `next/font/google`):**
- **Outfit** (500/700/800) para logo, títulos e títulos de seção.
- **Inter** (400/500/600) para textos, botões e metadados.
- Escala: o título do destaque tem 56–64px no desktop e 34px no celular, com entrelinha ~1,0. O título da página do filme tem 40–44px. Os títulos de seção e de fileira têm 20px.

**Foco e acessibilidade:**
- Todo elemento clicável tem foco visível, com contorno branco de 2–3px.
- `prefers-reduced-motion` desliga a transição de fundo do topo e o zoom dos pôsteres.

## 4. Vitrine (`/`)

### 4.1 Destaque
- **Filme:** o mais popular que está em algum streaming e tem `backdrop_path` e `overview`, pela nova consulta `getFeaturedMovie`.
- **Conteúdo:**
  - Imagem de fundo (`w1280`) ocupando ~80% da altura da tela no desktop e ~60% no celular, com degradês para a esquerda e para baixo que a dissolvem no fundo.
  - Título.
  - Ano, duração, ★ nota e logos dos streamings onde o filme está (todos os tipos de acesso, sem repetir).
  - Sinopse limitada a 3 linhas.
- **Botões:**
  - **"▶ Assistir trailer"** (branco): abre o trailer no modal existente (`TrailerModal`). Só aparece se houver `trailer_key`.
  - **"Ver detalhes"** (cinza translúcido): vai para `/filme/[id]`.
- **Sem destaque:** se nenhum filme tiver imagem de fundo, o destaque não aparece e a página começa pelas fileiras, com espaço para o topo.

### 4.2 Fileiras
Configuradas em `src/lib/home-rows.ts`, nesta ordem:

| # | Título | Consulta (`search_movies`) | "Ver todos" |
|---|---|---|---|
| 1 | Em alta agora | padrão (popularidade) | `/catalogo` |
| 2 | Na Netflix | `streaming=[8]`, `acesso=[flatrate]` | `/catalogo?streaming=8&acesso=flatrate` |
| 3 | No Prime Video | `streaming=[119]`, `acesso=[flatrate]` | `/catalogo?streaming=119&acesso=flatrate` |
| 4 | No Disney+ | `streaming=[337]`, `acesso=[flatrate]` | `/catalogo?streaming=337&acesso=flatrate` |
| 5 | Na Max | `streaming=[1899]`, `acesso=[flatrate]` | `/catalogo?streaming=1899&acesso=flatrate` |
| 6 | Ação | `genero=[28]` | `/catalogo?genero=28` |
| 7 | Comédia | `genero=[35]` | `/catalogo?genero=35` |
| 8 | Terror | `genero=[27]` | `/catalogo?genero=27` |
| 9 | Animação | `genero=[16]` | `/catalogo?genero=16` |
| 10 | Drama | `genero=[18]` | `/catalogo?genero=18` |
| 11 | Mais bem avaliados | `ordem=nota` | `/catalogo?ordem=nota` |

- Cada fileira usa `CatalogFilters`, o mesmo tipo do catálogo. O link "Ver todos" é gerado por `filtersToQuery` a partir dos mesmos filtros, e a fileira mostra os primeiros filmes do que "Ver todos" mostra.
- Cada fileira pede **20 filmes**. `searchMovies` ganha um parâmetro opcional `limit` (padrão 24, que é o `PAGE_SIZE`).
- As 11 consultas e o destaque rodam em paralelo no servidor (`Promise.all`).
- **Fileira vazia não aparece.** Isso acontece, por exemplo, com um streaming sem filmes ou com os dados de exemplo.
- **Rolagem lateral:**
  - Faixa com `overflow-x: auto` e `scroll-snap`, sem barra visível.
  - No desktop, botões "‹" e "›" nas bordas, que rolam uma "tela" da faixa. Aparecem ao passar o mouse ou ao focar pelo teclado, e ficam escondidos quando não há para onde rolar.
  - No celular, a rolagem é com o dedo.
- **Card:** o mesmo `MovieCard` do catálogo, com pôster 2:3, ★ nota no canto, título e logos dos streamings, restilizado com a nova paleta.
  - Largura fixa na fileira: 150px no desktop, 120px no celular.
  - No hover, zoom leve do pôster, desligado com movimento reduzido.

## 5. Busca (`/busca?q=...`)

**Banco (nova migração):**
- `create extension if not exists unaccent with schema extensions;` e o mesmo para `pg_trgm`.
- Função `public.f_unaccent(text)`, `immutable`, que envolve `extensions.unaccent`. É necessária para o índice.
- Índice GIN trigram em `f_unaccent(lower(title || ' ' || original_title))`.
- Função `public.search_titles(p_query text, p_limit int default 24, p_offset int default 0)`:
  - Retorna as mesmas colunas de `search_movies`: `id, title, release_date, runtime, vote_average, poster_path, providers jsonb, total_count`.
  - Casa `f_unaccent(lower(title || ' ' || original_title)) like '%' || f_unaccent(lower(termo)) || '%'`, com `%`, `_` e `\` escapados no termo.
  - Só traz filmes com pelo menos um `movie_providers`.
  - Ordena por `popularity desc, id`.
  - Limita a 100 por chamada e ignora offset negativo.
  - `security invoker`, `stable`, `set search_path = public, extensions`, `set plan_cache_mode = force_custom_plan`.
  - `grant execute` para `anon` e `authenticated`.

**Site:**
- `searchTitles(db, query, offset)` em `src/lib/queries/searchTitles.ts` retorna um `SearchResult`, igual a `searchMovies`.
- **Validação do termo** (`parseSearchQuery` em `src/lib/filters.ts`): remove espaços nas pontas e corta em 100 caracteres. Menos de 2 caracteres conta como "sem busca".
- **Página:**
  - Título "Resultados para "<termo>"" e o total ("1 filme" / "N filmes").
  - A mesma grade de pôsteres do catálogo, com "Carregar mais". A Server Action `loadMoreSearch(q, offset)` revalida o termo e o offset.
- **Casos:**
  - Termo ausente ou curto: "Digite pelo menos 2 letras para buscar."
  - Nenhum resultado: "Nenhum filme encontrado para "<termo>"", com o link "Ver o catálogo".
- O campo do topo já vem preenchido com o termo atual quando a pessoa está em `/busca`.

## 6. Página do filme (`/filme/[id]`), novo layout

Segue o segundo print do usuário:
- **Fundo:** a imagem de fundo do filme (se existir), bem escurecida e desfocada, só no topo, dissolvendo no `#141414`.
- **Topo da área:** "‹ Voltar", com a mesma lógica atual do `BackLink`, generalizada (ver 7).
- **Duas colunas no desktop:**
  - Pôster (`w500`, cerca de 220–260px de largura, cantos arredondados).
  - Informações:
    - Título.
    - Pílulas com ★ nota, ano e duração.
    - Gêneros em pílulas contornadas.
    - Sinopse.
    - **"Onde assistir"**: título com barra vermelha e grupos Assinatura / Aluguel / Compra. Cada streaming aparece como chip com logo e nome. Embaixo vem "Dados de disponibilidade: JustWatch".
    - **"Trailer"**: título com barra vermelha e o trailer **embutido** em 16:9. Para não carregar o YouTube sem necessidade, a página mostra primeiro a miniatura (`https://i.ytimg.com/vi/<key>/hqdefault.jpg`) com um botão "▶ Reproduzir trailer". O clique troca a miniatura pelo iframe do `youtube-nocookie.com` com autoplay.
  - Sem trailer, a seção "Trailer" não aparece.
- **Celular:** pôster em cima (largura ~160px, centralizado) e informações embaixo.
- `generateMetadata`, `notFound()` e o `not-found.tsx` do filme continuam iguais.

## 7. Comportamento que muda nas partes existentes

- **Catálogo** (`src/app/catalogo/page.tsx`): o conteúdo atual de `src/app/page.tsx` muda para lá. Tudo o que navega para o catálogo passa a apontar para `/catalogo`:
  - `useFilterNavigation`;
  - o "Limpar filtros" do `EmptyState`;
  - o `BackLink` (padrão de volta ao catálogo).
- **Voltar do filme:**
  - Clicar num card de **qualquer** lista (vitrine, catálogo, busca) marca que o filme foi aberto de dentro do site, e "‹ Voltar" usa `router.back()`.
  - Sem essa marca (link aberto de fora), "‹ Voltar" vai para `/`.
  - A restauração de blocos carregados e da rolagem do catálogo (`catalogSession`) continua valendo para `/catalogo`.
- **Trailer na vitrine:** reaproveita o `TrailerModal` atual, com foco, Esc e retorno do foco.
- **Componentes da página do filme:** `MovieHero` é substituído pelo novo layout. `WhereToWatch` passa a mostrar chips com logo e nome.

## 8. Erros e casos vazios

- Banco fora do ar em qualquer página: o `error.tsx` atual.
- Destaque ausente: a página começa pelas fileiras.
- Fileira vazia: não aparece. Se **todas** estiverem vazias e não houver destaque: "O catálogo ainda está sendo carregado. Volte em alguns minutos.", com o link "Ver o catálogo".
- Busca: casos da seção 5.
- Imagens ausentes (pôster, fundo, logo): o fundo neutro e as iniciais que já existem.

## 9. Testes

- **Unitários (Vitest):**
  - `home-rows.ts`: 11 fileiras, na ordem, e o link "Ver todos" de cada tipo (streaming, gênero, ordem, padrão) gerado por `filtersToQuery`.
  - `parseSearchQuery`: espaços, corte em 100, mínimo de 2.
- **Integração (Supabase local, dados de exemplo):**
  - `search_titles`:
    - "cidade de" encontra só o filme 3;
    - "corra" encontra só o filme 1;
    - "hereditario" encontra só o filme 2 (ignora acento);
    - "get out" encontra só o filme 1 (título original);
    - "sem streaming" não encontra nada (o filme 9 não está em nenhum streaming);
    - `%` sozinho não encontra nada (o caractere é escapado);
    - `p_limit` 1000 devolve no máximo 100. Isso é verificado inserindo 150 filmes dentro de uma transação desfeita no fim, como em `searchMoviesLimits.int.test.ts`.
  - `getFeaturedMovie`: com os dados de exemplo (sem imagens de fundo), retorna `null`. Com um filme de teste com `backdrop_path`, criado e apagado pelo próprio teste, retorna esse filme.
  - `searchMovies` com `limit: 20` retorna 20.
- **Navegador (Playwright):**
  - **Vitrine:**
    - Com os dados de exemplo, aparecem exatamente as fileiras "Em alta agora", "Na Netflix", "No Disney+", "Na Max", "Ação", "Terror", "Drama" e "Mais bem avaliados".
    - "No Prime Video", "Comédia" e "Animação" não têm filmes nos dados de exemplo e não aparecem.
    - "Ver todos" de "Na Netflix" abre `/catalogo?streaming=8&acesso=flatrate` com 3 filmes.
  - `/?streaming=8` redireciona para `/catalogo?streaming=8`.
  - **Busca:** digitar "corra" no topo e enviar leva a `/busca?q=corra` com 1 card; um termo sem resultado mostra a mensagem.
  - **Página do filme:** mostra as pílulas, "Onde assistir" com o chip "Netflix" e a miniatura do trailer; clicar em "Reproduzir trailer" cria o iframe `youtube-nocookie`.
  - **Voltar:** pela vitrine, abrir um card e clicar em "‹ Voltar" volta para `/`.
  - **Testes existentes:** os do catálogo passam a usar `/catalogo`, e os da página do filme são adaptados ao trailer embutido.
- **Dados de exemplo:** o filme 1 (Corra!) já tem trailer. Para testar o destaque, o teste de integração cria o próprio filme com imagem de fundo. No e2e, o destaque não aparece com os dados de exemplo, e isso também é testado (a página começa pelas fileiras).
