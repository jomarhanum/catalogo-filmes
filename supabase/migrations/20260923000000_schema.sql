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
