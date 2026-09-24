import { describe, expect, it } from 'vitest';
import {
  DEFAULT_FILTERS,
  catalogRedirectTarget,
  countExtraFilters,
  filtersToQuery,
  parseFilters,
  parseMovieId,
  parseOffset,
  toggle,
} from './filters';

describe('parseFilters', () => {
  it('ignora ids fora do intervalo de integer do Postgres', () => {
    const f = parseFilters({ streaming: '8,3000000000', genero: '3000000000' });
    expect(f.providers).toEqual([8]);
    expect(f.genres).toEqual([]);
  });

  it('sem parâmetros retorna o padrão', () => {
    expect(parseFilters({})).toEqual(DEFAULT_FILTERS);
  });

  it('lê todos os filtros', () => {
    expect(
      parseFilters({
        streaming: '8,119',
        acesso: 'flatrate,rent',
        genero: '27',
        ano_min: '2000',
        ano_max: '2020',
        nota: '7.5',
        duracao_max: '120',
        idioma: 'en',
        ordem: 'nota',
      }),
    ).toEqual({
      providers: [8, 119],
      access: ['flatrate', 'rent'],
      genres: [27],
      yearMin: 2000,
      yearMax: 2020,
      minRating: 7.5,
      maxRuntime: 120,
      language: 'en',
      sort: 'nota',
    });
  });

  it('ignora valores inválidos', () => {
    expect(
      parseFilters({
        streaming: 'abc',
        acesso: 'gratis',
        ano_min: '50',
        nota: 'abc',
        duracao_max: '-3',
        idioma: 'portugues',
        ordem: 'aleatorio',
      }),
    ).toEqual(DEFAULT_FILTERS);
  });

  it('junta parâmetros repetidos e descarta só as partes inválidas', () => {
    expect(parseFilters({ streaming: ['8', 'abc,119', '8'] }).providers).toEqual([8, 119]);
  });

  it('troca ano_min e ano_max quando vêm invertidos', () => {
    const f = parseFilters({ ano_min: '2020', ano_max: '2000' });
    expect([f.yearMin, f.yearMax]).toEqual([2000, 2020]);
  });
});

describe('filtersToQuery', () => {
  it('omite padrões', () => {
    expect(filtersToQuery(DEFAULT_FILTERS)).toBe('');
  });

  it('serializa na ordem fixa com vírgulas', () => {
    expect(
      filtersToQuery({
        ...DEFAULT_FILTERS,
        providers: [8, 119],
        access: ['rent'],
        genres: [27, 53],
        yearMin: 2000,
        minRating: 7,
        language: 'pt',
        sort: 'az',
      }),
    ).toBe('streaming=8,119&acesso=rent&genero=27,53&ano_min=2000&nota=7&idioma=pt&ordem=az');
  });

  it('ida e volta preserva os filtros', () => {
    const f = parseFilters({ streaming: '337', ano_max: '2010', duracao_max: '90', ordem: 'recentes' });
    expect(parseFilters(Object.fromEntries(new URLSearchParams(filtersToQuery(f))))).toEqual(f);
  });
});

describe('countExtraFilters', () => {
  it('conta só os filtros da gaveta', () => {
    expect(countExtraFilters({ ...DEFAULT_FILTERS, providers: [8], access: ['buy'] })).toBe(0);
    expect(
      countExtraFilters({ ...DEFAULT_FILTERS, genres: [27, 53], yearMin: 2000, yearMax: 2010, language: 'en' }),
    ).toBe(3);
  });
});

describe('toggle', () => {
  it('adiciona e remove', () => {
    expect(toggle([8], 119)).toEqual([8, 119]);
    expect(toggle([8, 119], 8)).toEqual([119]);
  });
});

describe('parseOffset', () => {
  it('aceita inteiros entre 0 e 10000', () => {
    expect(parseOffset(24)).toBe(24);
    expect(parseOffset(10000)).toBe(10000);
  });
  it('qualquer outra coisa vira 0', () => {
    for (const bad of [-5, 'abc', 1e9, 2.5, null, undefined, Number.NaN]) expect(parseOffset(bad)).toBe(0);
  });
});

describe('parseMovieId', () => {
  it('aceita só dígitos', () => {
    expect(parseMovieId('550')).toBe(550);
    expect(parseMovieId('abc')).toBeNull();
    expect(parseMovieId('5.5')).toBeNull();
    expect(parseMovieId('')).toBeNull();
    expect(parseMovieId('12345678901')).toBeNull();
  });
});

describe('catalogRedirectTarget', () => {
  it('sem parâmetros do catálogo não redireciona', () => {
    expect(catalogRedirectTarget({})).toBeNull();
    expect(catalogRedirectTarget({ q: 'corra', utm_source: 'x' })).toBeNull();
  });

  it('leva os filtros válidos para /catalogo', () => {
    expect(catalogRedirectTarget({ streaming: '8' })).toBe('/catalogo?streaming=8');
    expect(catalogRedirectTarget({ streaming: '8,abc', genero: '27', x: '1' })).toBe('/catalogo?streaming=8&genero=27');
  });

  it('parâmetro do catálogo só com valores inválidos vai para /catalogo limpo', () => {
    expect(catalogRedirectTarget({ nota: 'abc' })).toBe('/catalogo');
  });
});
