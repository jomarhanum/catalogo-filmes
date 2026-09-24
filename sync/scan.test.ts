import { describe, expect, it } from 'vitest';
import { fullRange, scanDiscover, splitRange } from './scan';
import type { DateRange, DiscoverParams, DiscoverPage } from './tmdb';

const year = (date: string) => Number(date.slice(0, 4));
const span = (r: DateRange) => year(r.lte) - year(r.gte) + 1;

function stub(totalPages: (p: DiscoverParams) => number) {
  const calls: DiscoverParams[] = [];
  return {
    calls,
    async discover(p: DiscoverParams): Promise<DiscoverPage> {
      calls.push(p);
      return { page: p.page, total_pages: totalPages(p), total_results: 0, results: [{ id: p.page } as never] };
    },
  };
}

describe('splitRange', () => {
  it('divide ao meio pelos anos', () => {
    expect(splitRange({ gte: '1870-01-01', lte: '2027-12-31' })).toEqual([
      { gte: '1870-01-01', lte: '1948-12-31' },
      { gte: '1949-01-01', lte: '2027-12-31' },
    ]);
  });
  it('não divide um ano só', () => {
    expect(splitRange({ gte: '2020-01-01', lte: '2020-12-31' })).toBeNull();
  });
});

describe('fullRange', () => {
  it('vai de 1870 até o fim do ano seguinte', () => {
    expect(fullRange(new Date('2026-09-23T00:00:00Z'))).toEqual({ gte: '1870-01-01', lte: '2027-12-31' });
  });
});

describe('scanDiscover', () => {
  const query = { providerId: 8, accessType: 'flatrate' as const };

  it('percorre todas as páginas quando cabe no limite', async () => {
    const tmdb = stub(() => 3);
    const pages: number[] = [];
    await scanDiscover(tmdb, query, async (movies) => void pages.push(movies[0].id));
    expect(pages).toEqual([1, 2, 3]);
    expect(tmdb.calls.every((c) => c.range === undefined)).toBe(true);
  });

  it('divide por anos quando passa de 500 páginas', async () => {
    const tmdb = stub((p) => (!p.range || span(p.range) > 1 ? 600 : 2));
    let pageCount = 0;
    await scanDiscover(tmdb, query, async () => void pageCount++, {
      fullRange: { gte: '2000-01-01', lte: '2003-12-31' },
    });
    expect(pageCount).toBe(8);
    const fetched = tmdb.calls.filter((c) => c.range && span(c.range) === 1);
    expect(new Set(fetched.map((c) => c.range!.gte))).toEqual(
      new Set(['2000-01-01', '2001-01-01', '2002-01-01', '2003-01-01']),
    );
  });

  it('um ano só com mais de 500 páginas para em 500 e avisa', async () => {
    const tmdb = stub(() => 600);
    const logs: string[] = [];
    let pageCount = 0;
    await scanDiscover(tmdb, query, async () => void pageCount++, {
      range: { gte: '2020-01-01', lte: '2020-12-31' },
      log: (m) => logs.push(m),
    });
    expect(pageCount).toBe(500);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toContain('500');
  });
});
