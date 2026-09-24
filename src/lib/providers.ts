import { ACCESS_TYPES, type AccessType } from './filters';
import type { ProviderRef } from './queries/types';

export function uniqueProviders(watch: Record<AccessType, ProviderRef[]>): ProviderRef[] {
  const seen = new Map<number, ProviderRef>();
  for (const type of ACCESS_TYPES) {
    for (const provider of watch[type]) if (!seen.has(provider.id)) seen.set(provider.id, provider);
  }
  return [...seen.values()];
}
