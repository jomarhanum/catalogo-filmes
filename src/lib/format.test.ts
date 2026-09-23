import { describe, expect, it } from 'vitest';
import { formatRating, formatRuntime, formatYear } from './format';

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
  it('uma casa decimal', () => {
    expect(formatRating(7.6)).toBe('7.6');
    expect(formatRating(8)).toBe('8.0');
  });
});
