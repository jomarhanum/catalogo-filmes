'use client';

import { useEffect, useRef, useState } from 'react';
import { toggle, type CatalogFilters } from '@/lib/filters';
import { formatRating, formatRuntime } from '@/lib/format';
import type { GenreRef } from '@/lib/queries/types';

const YEAR_ERROR = 'Informe um ano entre 1870 e 2100';

const LANGUAGES: [string, string][] = [
  ['en', 'Inglês'],
  ['pt', 'Português'],
  ['es', 'Espanhol'],
  ['fr', 'Francês'],
  ['it', 'Italiano'],
  ['de', 'Alemão'],
  ['ja', 'Japonês'],
  ['ko', 'Coreano'],
];

const RATING_OPTIONS = [6, 7, 8];
const RUNTIME_OPTIONS = [90, 120, 150];

const ratingLabel = (value: number) => `★ ${formatRating(value).replace(/,0$/, '')}+`;
const runtimeLabel = (minutes: number) => `Até ${formatRuntime(minutes)}`;

// Um valor válido vindo da URL que não está entre as opções fixas vira uma opção extra,
// para o select mostrar o filtro que está ativo.
function withCurrent(options: number[], current: number | null): number[] {
  return current === null || options.includes(current) ? options : [...options, current].sort((a, b) => a - b);
}

type Extra = Pick<CatalogFilters, 'genres' | 'yearMin' | 'yearMax' | 'minRating' | 'maxRuntime' | 'language'>;

const EMPTY: Extra = { genres: [], yearMin: null, yearMax: null, minRating: null, maxRuntime: null, language: null };

interface Props {
  open: boolean;
  filters: CatalogFilters;
  genres: GenreRef[];
  onClose: () => void;
  onApply: (patch: Extra) => void;
}

export function FiltersDrawer({ open, ...props }: Props) {
  // Montar só quando abre faz o rascunho recomeçar dos filtros atuais a cada abertura.
  return open ? <DrawerBody {...props} /> : null;
}

function numberOrNull(value: string): number | null {
  return value === '' ? null : Number(value);
}

function isValidYear(value: number | null): boolean {
  return value === null || (Number.isInteger(value) && value >= 1870 && value <= 2100);
}

function DrawerBody({ filters, genres, onClose, onApply }: Omit<Props, 'open'>) {
  const [draft, setDraft] = useState<Extra>({
    genres: filters.genres,
    yearMin: filters.yearMin,
    yearMax: filters.yearMax,
    minRating: filters.minRating,
    maxRuntime: filters.maxRuntime,
    language: filters.language,
  });
  const [yearError, setYearError] = useState<string | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const set = (patch: Partial<Extra>) => setDraft((d) => ({ ...d, ...patch }));
  const field = 'mt-1 w-full rounded-md border border-border bg-surface px-2 py-1.5';

  // Ao abrir, o foco vai para o painel; Esc funciona mesmo se o foco estiver num campo interno.
  useEffect(() => {
    panelRef.current?.focus();
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleApply = () => {
    if (!isValidYear(draft.yearMin) || !isValidYear(draft.yearMax)) {
      setYearError(YEAR_ERROR);
      return;
    }
    setYearError(null);
    onApply(draft);
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60" onClick={onClose}>
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Mais filtros"
        tabIndex={-1}
        className="h-full w-full space-y-5 overflow-y-auto bg-surface-2 p-5 outline-none sm:max-w-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Mais filtros</h2>
          <button type="button" onClick={onClose} className="text-sm text-muted underline">
            Fechar
          </button>
        </div>

        <fieldset>
          <legend className="text-xs font-semibold uppercase tracking-wider text-muted">Gênero</legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {genres.map((g) => {
              const on = draft.genres.includes(g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => set({ genres: toggle(draft.genres, g.id) })}
                  className={`rounded-full border px-3 py-1 text-sm ${
                    on ? 'border-accent bg-accent font-semibold text-black' : 'border-border bg-surface'
                  }`}
                >
                  {g.name}
                </button>
              );
            })}
          </div>
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Ano (de)
            <input
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              step={1}
              value={draft.yearMin ?? ''}
              onChange={(e) => {
                set({ yearMin: numberOrNull(e.target.value) });
                setYearError(null);
              }}
              aria-invalid={yearError ? true : undefined}
              aria-describedby={yearError ? 'ano-error' : undefined}
              className={field}
            />
          </label>
          <label className="text-sm">
            Ano (até)
            <input
              type="number"
              inputMode="numeric"
              min={1870}
              max={2100}
              step={1}
              value={draft.yearMax ?? ''}
              onChange={(e) => {
                set({ yearMax: numberOrNull(e.target.value) });
                setYearError(null);
              }}
              aria-invalid={yearError ? true : undefined}
              aria-describedby={yearError ? 'ano-error' : undefined}
              className={field}
            />
          </label>
        </div>
        {yearError && (
          <p id="ano-error" role="alert" className="-mt-3 text-sm text-red-400">
            {yearError}
          </p>
        )}

        <label className="block text-sm">
          Nota mínima
          <select
            value={draft.minRating ?? ''}
            onChange={(e) => set({ minRating: numberOrNull(e.target.value) })}
            className={field}
          >
            <option value="">Qualquer</option>
            {withCurrent(RATING_OPTIONS, filters.minRating).map((value) => (
              <option key={value} value={value}>
                {ratingLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Duração máxima
          <select
            value={draft.maxRuntime ?? ''}
            onChange={(e) => set({ maxRuntime: numberOrNull(e.target.value) })}
            className={field}
          >
            <option value="">Qualquer</option>
            {withCurrent(RUNTIME_OPTIONS, filters.maxRuntime).map((value) => (
              <option key={value} value={value}>
                {runtimeLabel(value)}
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          Idioma
          <select
            value={draft.language ?? ''}
            onChange={(e) => set({ language: e.target.value || null })}
            className={field}
          >
            <option value="">Qualquer</option>
            {filters.language !== null && !LANGUAGES.some(([code]) => code === filters.language) && (
              <option value={filters.language}>{filters.language}</option>
            )}
            {LANGUAGES.map(([code, name]) => (
              <option key={code} value={code}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => {
              setDraft(EMPTY);
              setYearError(null);
            }}
            className="flex-1 rounded-md border border-border px-4 py-2 text-sm"
          >
            Limpar
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="flex-1 rounded-md bg-accent px-4 py-2 text-sm font-semibold text-black"
          >
            Aplicar
          </button>
        </div>
      </div>
    </div>
  );
}
