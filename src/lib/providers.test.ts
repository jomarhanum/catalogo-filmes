import { describe, expect, it } from 'vitest';
import { uniqueProviders } from './providers';

const netflix = { id: 8, name: 'Netflix', logoPath: null };
const prime = { id: 119, name: 'Amazon Prime Video', logoPath: null };

describe('uniqueProviders', () => {
  it('junta os tipos de acesso sem repetir, na ordem assinatura → aluguel → compra', () => {
    expect(uniqueProviders({ flatrate: [netflix], rent: [prime], buy: [prime] })).toEqual([netflix, prime]);
  });

  it('vazio quando não há streamings', () => {
    expect(uniqueProviders({ flatrate: [], rent: [], buy: [] })).toEqual([]);
  });
});
