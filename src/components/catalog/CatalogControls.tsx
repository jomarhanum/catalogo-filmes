'use client';

import { useRef, useState } from 'react';
import { countExtraFilters, type CatalogFilters } from '@/lib/filters';
import type { GenreRef, ProviderRef } from '@/lib/queries/types';
import { AccessTypeChips } from './AccessTypeChips';
import { FiltersDrawer } from './FiltersDrawer';
import { ProviderPicker } from './ProviderPicker';
import { useFilterNavigation } from './useFilterNavigation';

interface Props {
  filters: CatalogFilters;
  providers: ProviderRef[];
  genres: GenreRef[];
}

export function CatalogControls({ filters, providers, genres }: Props) {
  const navigate = useFilterNavigation(filters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const extra = countExtraFilters(filters);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeDrawer = () => {
    setDrawerOpen(false);
    // Devolve o foco ao gatilho ao fechar (Fechar, Escape, clique fora ou Aplicar).
    triggerRef.current?.focus();
  };

  return (
    <section className="space-y-3">
      <ProviderPicker providers={providers} selected={filters.providers} onChange={(ids) => navigate({ providers: ids })} />
      <div className="flex flex-wrap items-center gap-2">
        <AccessTypeChips selected={filters.access} onChange={(access) => navigate({ access })} />
        <button
          ref={triggerRef}
          type="button"
          aria-haspopup="dialog"
          aria-expanded={drawerOpen}
          onClick={() => setDrawerOpen(true)}
          className="rounded-full border border-border bg-surface px-3 py-1 text-sm"
        >
          <span aria-hidden="true">⚙</span> Mais filtros{extra > 0 ? ` (${extra})` : ''}
        </button>
      </div>
      <FiltersDrawer
        open={drawerOpen}
        filters={filters}
        genres={genres}
        onClose={closeDrawer}
        onApply={(patch) => {
          closeDrawer();
          navigate(patch);
        }}
      />
    </section>
  );
}
