'use client';

import { ACCESS_LABELS, ACCESS_TYPES, toggle, type AccessType } from '@/lib/filters';

interface Props {
  selected: AccessType[];
  onChange: (access: AccessType[]) => void;
}

export function AccessTypeChips({ selected, onChange }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {ACCESS_TYPES.map((type) => {
        const on = selected.includes(type);
        return (
          <button
            key={type}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(toggle(selected, type))}
            className={`rounded-full border px-3 py-1 text-sm ${
              on ? 'border-accent bg-accent font-semibold text-white' : 'border-border bg-surface'
            }`}
          >
            {ACCESS_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
