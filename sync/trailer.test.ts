import { describe, expect, it } from 'vitest';
import type { TmdbVideo } from './tmdb';
import { pickTrailer } from './trailer';

const video = (patch: Partial<TmdbVideo>): TmdbVideo => ({
  key: 'k',
  site: 'YouTube',
  type: 'Trailer',
  official: true,
  iso_639_1: 'en',
  published_at: '2020-01-01T00:00:00.000Z',
  ...patch,
});

describe('pickTrailer', () => {
  it('prefere português', () => {
    expect(pickTrailer([video({ key: 'en' }), video({ key: 'pt', iso_639_1: 'pt' })])).toBe('pt');
  });
  it('depois inglês, depois outros idiomas', () => {
    expect(pickTrailer([video({ key: 'fr', iso_639_1: 'fr' }), video({ key: 'en' })])).toBe('en');
    expect(pickTrailer([video({ key: 'fr', iso_639_1: 'fr' })])).toBe('fr');
  });
  it('oficial antes de não oficial, depois o mais recente', () => {
    expect(
      pickTrailer([
        video({ key: 'fan', official: false, published_at: '2024-01-01T00:00:00.000Z' }),
        video({ key: 'old' }),
        video({ key: 'new', published_at: '2021-01-01T00:00:00.000Z' }),
      ]),
    ).toBe('new');
  });
  it('ignora quem não é trailer do YouTube', () => {
    expect(pickTrailer([video({ site: 'Vimeo' }), video({ type: 'Teaser' })])).toBeNull();
    expect(pickTrailer([])).toBeNull();
  });
});
