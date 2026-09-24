'use client';

import { useState } from 'react';
import { ProviderLogo } from '@/components/ProviderLogo';
import { toggle } from '@/lib/filters';
import type { ProviderRef } from '@/lib/queries/types';

const VISIBLE = 8;

interface Props {
  providers: ProviderRef[];
  selected: number[];
  onChange: (ids: number[]) => void;
}

export function ProviderPicker({ providers, selected, onChange }: Props) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? providers : providers.filter((p, i) => i < VISIBLE || selected.includes(p.id));

  return (
    <div className="flex flex-wrap items-center gap-2">
      {visible.map((p) => {
        const on = selected.includes(p.id);
        const dim = selected.length > 0 && !on;
        return (
          <button
            key={p.id}
            type="button"
            aria-label={p.name}
            aria-pressed={on}
            title={p.name}
            onClick={() => onChange(toggle(selected, p.id))}
            className={`rounded-lg p-0.5 transition ${on ? 'ring-2 ring-accent' : ''} ${dim ? 'opacity-40 hover:opacity-80' : ''}`}
          >
            <ProviderLogo provider={p} size={44} />
          </button>
        );
      })}
      {providers.length > VISIBLE && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className="text-sm text-muted underline">
          {showAll ? 'ver menos' : `ver todos (${providers.length})`}
        </button>
      )}
    </div>
  );
}
