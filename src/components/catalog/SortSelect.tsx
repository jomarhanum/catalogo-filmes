'use client';

import { SORT_KEYS, SORT_LABELS, type CatalogFilters, type SortKey } from '@/lib/filters';
import { useFilterNavigation } from './useFilterNavigation';

export function SortSelect({ filters }: { filters: CatalogFilters }) {
  const navigate = useFilterNavigation(filters);
  return (
    <label className="flex items-center gap-2">
      Ordenar por
      <select
        value={filters.sort}
        onChange={(e) => navigate({ sort: e.target.value as SortKey })}
        className="rounded-md border border-border bg-surface px-2 py-1 text-fg"
      >
        {SORT_KEYS.map((key) => (
          <option key={key} value={key}>
            {SORT_LABELS[key]}
          </option>
        ))}
      </select>
    </label>
  );
}
