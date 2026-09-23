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
