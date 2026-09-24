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
