'use client';

import { useRouter } from 'next/navigation';
import { useCallback } from 'react';
import { filtersToQuery, type CatalogFilters } from '@/lib/filters';

export function useFilterNavigation(filters: CatalogFilters) {
  const router = useRouter();
  return useCallback(
    (patch: Partial<CatalogFilters>) => {
      const query = filtersToQuery({ ...filters, ...patch });
      router.push(query ? `/catalogo?${query}` : '/catalogo', { scroll: false });
    },
    [filters, router],
  );
}
