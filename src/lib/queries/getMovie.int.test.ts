import { describe, expect, it } from 'vitest';
import { anonDb } from '../../../tests/support/db';
import { getMovie } from './getMovie';

const db = anonDb();

describe('getMovie', () => {
  it('traz detalhes, gêneros e onde assistir agrupado', async () => {
    expect(await getMovie(db, 1)).toEqual({
      id: 1,
      title: 'Corra!',
      originalTitle: 'Get Out',
      overview: 'Um jovem visita a família da namorada e descobre segredos perturbadores.',
      releaseDate: '2017-02-24',
      runtime: 104,
      voteAverage: 7.6,
      posterPath: null,
      backdropPath: null,
      trailerKey: 'sRfnevzM9kQ',
      genres: ['Terror', 'Thriller'],
      watch: {
        flatrate: [{ id: 8, name: 'Netflix', logoPath: null }],
        rent: [{ id: 119, name: 'Amazon Prime Video', logoPath: null }],
        buy: [{ id: 119, name: 'Amazon Prime Video', logoPath: null }],
      },
    });
  });

  it('null para filme fora de qualquer streaming', async () => {
    expect(await getMovie(db, 9)).toBeNull();
  });

  it('null para filme inexistente', async () => {
    expect(await getMovie(db, 999999)).toBeNull();
  });
});
