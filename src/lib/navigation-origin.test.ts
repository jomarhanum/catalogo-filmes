import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearFilmOpenedFromSite,
  filmOpenedFromSite,
  isPlainLeftClick,
  markFilmOpenedFromSite,
} from './navigation-origin';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
}

describe('navigation-origin', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it('marca e reconhece o filme aberto de dentro do site', () => {
    expect(filmOpenedFromSite('/filme/1')).toBe(false);
    markFilmOpenedFromSite('/filme/1');
    expect(filmOpenedFromSite('/filme/1')).toBe(true);
    expect(filmOpenedFromSite('/filme/2')).toBe(false);
    clearFilmOpenedFromSite();
    expect(filmOpenedFromSite('/filme/1')).toBe(false);
  });

  it('sem sessionStorage não quebra', () => {
    vi.stubGlobal('sessionStorage', undefined);
    expect(() => markFilmOpenedFromSite('/filme/1')).not.toThrow();
    expect(filmOpenedFromSite('/filme/1')).toBe(false);
  });

  it('isPlainLeftClick ignora cliques com modificador ou botão do meio', () => {
    const click = { button: 0, metaKey: false, ctrlKey: false, shiftKey: false, altKey: false };
    expect(isPlainLeftClick(click)).toBe(true);
    expect(isPlainLeftClick({ ...click, ctrlKey: true })).toBe(false);
    expect(isPlainLeftClick({ ...click, button: 1 })).toBe(false);
  });
});
