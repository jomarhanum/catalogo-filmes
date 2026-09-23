import type { Db, GenreRef, ProviderRef } from './types';

export async function listProviders(db: Db): Promise<ProviderRef[]> {
  const { data, error } = await db
    .from('available_providers')
    .select('id, name, logo_path')
    .order('display_priority')
    .order('id');
  if (error) throw new Error(`available_providers: ${error.message}`);
  return (data ?? []).map((p) => ({ id: p.id!, name: p.name!, logoPath: p.logo_path }));
}

export async function listGenres(db: Db): Promise<GenreRef[]> {
  const { data, error } = await db.from('genres').select('id, name');
  if (error) throw new Error(`genres: ${error.message}`);
  return (data ?? []).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
}
