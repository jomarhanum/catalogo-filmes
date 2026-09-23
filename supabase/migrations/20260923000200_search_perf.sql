-- Performance fix for public.search_movies.
--
-- Root cause (confirmed with EXPLAIN (ANALYZE, BUFFERS)): `search_movies` is a
-- LANGUAGE SQL function. Postgres cannot form a plan for a SQL-language
-- function's body that is specialized to the actual argument VALUES passed at
-- call time -- it always plans generically, treating every `p_x is null or ...`
-- branch as unknown. Under that generic plan, the planner drastically
-- underestimates the selectivity of the correlated
-- `exists (select 1 from movie_providers mp where mp.movie_id = m.id and ...)`
-- filter (it estimates ~1 row) and picks a Nested Loop Semi Join against
-- movie_providers instead of a Hash Semi Join. That nested loop reruns a scan
-- of movie_providers once per row of movies (9249 outer rows), touching
-- hundreds of thousands of buffers and taking 3-5.5s on ~9.2k movies -- this
-- is the actual cost, not the per-row `providers` jsonb subquery (that part
-- was already only evaluated for the final page of rows thanks to the
-- Limit/top-N sort, in every plan variant tested).
--
-- Fix: switch the function to LANGUAGE PLPGSQL. PL/pgSQL (via SPI) uses the
-- standard "custom plan for the first 5 executions, generic only if cheaper"
-- planning heuristic (plan_cache_mode = auto). Because the custom plan's
-- estimated cost here (~1900) is orders of magnitude below the generic plan's
-- estimated cost (~436000), Postgres keeps re-planning with the real argument
-- values on every call, which restores the Hash Semi Join / top-N heapsort
-- plan and its ~15-50ms runtime on this dataset. Verified with mixed
-- parameter combinations (default / p_providers / p_sort='nota') repeated
-- well past the 5-execution threshold in the same session -- all stayed fast.
--
-- Kept the CTE staging (filtered -> page -> providers-for-page) recommended
-- for this shape: it makes explicit that per-row provider aggregation only
-- ever runs for the `p_limit` rows of the current page, which remains true
-- and cheap regardless of dataset growth. No new indexes were needed: EXPLAIN
-- showed the existing movie_providers primary key (movie_id, provider_id,
-- access_type) already serves the per-page provider lookups as an Index Only
-- Scan, and the bulk `filtered` join is resolved well by a Hash Semi Join
-- once given a correct row estimate.
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
    limit p_limit offset p_offset
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
  from page pg;
end;
$$;

grant execute on function public.search_movies to anon, authenticated;
