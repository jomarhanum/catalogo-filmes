import type { AccessType } from '../src/lib/filters';
import type { DateRange, TmdbClient, TmdbMovie } from './tmdb';

export const MAX_PAGES = 500;

export function fullRange(now = new Date()): DateRange {
  return { gte: '1870-01-01', lte: `${now.getUTCFullYear() + 1}-12-31` };
}

export function splitRange(range: DateRange): [DateRange, DateRange] | null {
  const from = Number(range.gte.slice(0, 4));
  const to = Number(range.lte.slice(0, 4));
  if (from >= to) return null;
  const mid = Math.floor((from + to) / 2);
  return [
    { gte: range.gte, lte: `${mid}-12-31` },
    { gte: `${mid + 1}-01-01`, lte: range.lte },
  ];
}

export interface ScanOptions {
  log?: (msg: string) => void;
  range?: DateRange;
  fullRange?: DateRange;
}

// Filmes sem data de lançamento só entram quando a consulta cabe em 500 páginas sem dividir;
// ao dividir por datas, o TMDB deixa de fora quem não tem data. É uma perda aceitável.
export async function scanDiscover(
  tmdb: Pick<TmdbClient, 'discover'>,
  query: { providerId: number; accessType: AccessType },
  onPage: (movies: TmdbMovie[]) => Promise<void>,
  opts: ScanOptions = {},
): Promise<void> {
  const log = opts.log ?? (() => {});

  async function scan(range: DateRange | undefined): Promise<void> {
    const first = await tmdb.discover({ ...query, page: 1, range });
    if (first.total_pages > MAX_PAGES) {
      const halves = splitRange(range ?? opts.fullRange ?? fullRange());
      if (halves) {
        for (const half of halves) await scan(half);
        return;
      }
      log(
        `aviso: streaming ${query.providerId}/${query.accessType} em ${range?.gte}..${range?.lte} tem ` +
          `${first.total_pages} páginas; lendo só as primeiras ${MAX_PAGES}`,
      );
    }
    await onPage(first.results);
    const last = Math.min(first.total_pages, MAX_PAGES);
    for (let page = 2; page <= last; page++) {
      const next = await tmdb.discover({ ...query, page, range });
      await onPage(next.results);
    }
  }

  await scan(opts.range);
}
