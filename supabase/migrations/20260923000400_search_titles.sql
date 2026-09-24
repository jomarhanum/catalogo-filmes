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
