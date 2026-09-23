import { describe, expect, it } from 'vitest';
import { tmdbImage } from './tmdb-image';

describe('tmdbImage', () => {
  it('monta a URL do CDN do TMDB', () => {
    expect(tmdbImage('/abc.jpg', 'w342')).toBe('https://image.tmdb.org/t/p/w342/abc.jpg');
  });
  it('retorna null sem caminho', () => {
    expect(tmdbImage(null, 'w92')).toBeNull();
    expect(tmdbImage('', 'w92')).toBeNull();
  });
});
