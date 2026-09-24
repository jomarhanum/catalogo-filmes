-- Limites de página e ordem explícita em public.search_movies.
--
-- * p_limit passa a valer no máximo 100 (e no mínimo 0) e p_offset no mínimo 0:
--   a função é pública (anon) e antes aceitava qualquer limite, o que permitia
--   pedir o catálogo inteiro numa chamada; negativos davam erro 500.
-- * O select final repete as chaves de ordenação da CTE `page` (que carrega as
--   colunas de filme): a ordem do resultado não depende mais da ordem em que o
--   Postgres devolve as linhas da CTE. Repetir as chaves, em vez de um
--   row_number() sobre todo o conjunto filtrado, mantém o top-N heapsort na CTE.
--
-- Assinatura, semântica e configurações (plpgsql, stable, security invoker,
-- search_path, plan_cache_mode = force_custom_plan) são as mesmas da migração
-- 20260923000200_search_perf.sql; veja o cabeçalho dela para o motivo do
-- force_custom_plan.
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
language plpgsql
stable
security invoker
set search_path = public
set plan_cache_mode = force_custom_plan
as $$
begin
  return query
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
  ),
  page as (
    select f.*, count(*) over () as total_count
    from filtered f
    order by
      case when p_sort = 'nota' then f.vote_average end desc nulls last,
      case when p_sort = 'recentes' then f.release_date end desc nulls last,
      case when p_sort = 'az' then f.title end asc,
      f.popularity desc,
      f.id
    limit least(greatest(p_limit, 0), 100) offset greatest(p_offset, 0)
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
    ) as providers,
    pg.total_count
  from page pg
  -- Mesmas chaves da CTE page: a ordem final é explícita, não herdada da CTE.
  order by
    case when p_sort = 'nota' then pg.vote_average end desc nulls last,
    case when p_sort = 'recentes' then pg.release_date end desc nulls last,
    case when p_sort = 'az' then pg.title end asc,
    pg.popularity desc,
    pg.id;
end;
$$;

grant execute on function public.search_movies to anon, authenticated;
