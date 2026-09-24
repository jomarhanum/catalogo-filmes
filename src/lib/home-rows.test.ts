import { describe, expect, it } from 'vitest';
import { HOME_ROWS, HOME_ROW_SIZE, seeAllHref } from './home-rows';

const byId = (id: string) => {
  const row = HOME_ROWS.find((r) => r.id === id);
  if (!row) throw new Error(`fileira ${id} não existe`);
  return row;
};

describe('HOME_ROWS', () => {
  it('11 fileiras na ordem da spec', () => {
    expect(HOME_ROWS.map((r) => r.title)).toEqual([
      'Em alta agora',
      'Na Netflix',
      'No Prime Video',
      'No Disney+',
      'Na Max',
      'Ação',
      'Comédia',
      'Terror',
      'Animação',
      'Drama',
      'Mais bem avaliados',
    ]);
    expect(HOME_ROW_SIZE).toBe(20);
  });

  it('fileiras de streaming pedem só assinatura', () => {
    expect(byId('netflix').filters).toMatchObject({ providers: [8], access: ['flatrate'] });
    expect(byId('max').filters).toMatchObject({ providers: [1899], access: ['flatrate'] });
  });
});

describe('seeAllHref', () => {
  it('gera o link do catálogo com o filtro da fileira', () => {
    expect(seeAllHref(byId('em-alta'))).toBe('/catalogo');
    expect(seeAllHref(byId('netflix'))).toBe('/catalogo?streaming=8&acesso=flatrate');
    expect(seeAllHref(byId('terror'))).toBe('/catalogo?genero=27');
    expect(seeAllHref(byId('mais-bem-avaliados'))).toBe('/catalogo?ordem=nota');
  });
});
