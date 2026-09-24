import { HOME_ROWS, HOME_ROW_SIZE, type HomeRow } from '@/lib/home-rows';
import { searchMovies } from './searchMovies';
import type { Db, MovieCardData } from './types';

export interface HomeRowData {
  row: HomeRow;
  movies: MovieCardData[];
}

export async function getHomeRows(db: Db): Promise<HomeRowData[]> {
  const rows = await Promise.all(
    HOME_ROWS.map(async (row) => ({ row, movies: (await searchMovies(db, row.filters, 0, HOME_ROW_SIZE)).movies })),
  );
  return rows.filter((r) => r.movies.length > 0);
}
