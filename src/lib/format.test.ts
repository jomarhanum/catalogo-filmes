import { describe, expect, it } from 'vitest';
import { formatMovieCount, formatRating, formatRuntime, formatYear } from './format';

describe('formatYear', () => {
  it('extrai o ano de uma data ISO', () => expect(formatYear('2017-02-24')).toBe('2017'));
  it('retorna null sem data', () => {
    expect(formatYear(null)).toBeNull();
    expect(formatYear('')).toBeNull();
  });
});

describe('formatRuntime', () => {
  it('horas e minutos com dois dígitos', () => expect(formatRuntime(104)).toBe('1h44'));
  it('minutos com zero à esquerda', () => expect(formatRuntime(65)).toBe('1h05'));
  it('horas exatas', () => expect(formatRuntime(120)).toBe('2h'));
  it('menos de uma hora', () => expect(formatRuntime(45)).toBe('45min'));
  it('null para vazio ou zero', () => {
    expect(formatRuntime(null)).toBeNull();
    expect(formatRuntime(0)).toBeNull();
  });
});

describe('formatRating', () => {
  it('uma casa decimal com vírgula (pt-BR)', () => {
    expect(formatRating(7.6)).toBe('7,6');
    expect(formatRating(8)).toBe('8,0');
    expect(formatRating(7.25)).toMatch(/^7,[23]$/);
  });
});

describe('formatMovieCount', () => {
  it('singular para um filme', () => expect(formatMovieCount(1)).toBe('1 filme'));
  it('plural para zero e vários', () => {
    expect(formatMovieCount(0)).toBe('0 filmes');
    expect(formatMovieCount(38)).toBe('38 filmes');
  });
  it('separador de milhar pt-BR', () => expect(formatMovieCount(1234)).toBe('1.234 filmes'));
});
