import { ProviderLogo } from '@/components/ProviderLogo';
import { ACCESS_LABELS, ACCESS_TYPES } from '@/lib/filters';
import type { MovieDetails } from '@/lib/queries/types';

export function WhereToWatch({ watch }: { watch: MovieDetails['watch'] }) {
  return (
    <section aria-labelledby="onde-assistir" className="mt-8">
      <h2
        id="onde-assistir"
        className="flex items-center gap-2.5 font-display text-lg font-bold before:h-5 before:w-1 before:rounded-full before:bg-accent"
      >
        Onde assistir
      </h2>
      <dl className="mt-4 space-y-3">
        {ACCESS_TYPES.filter((type) => watch[type].length > 0).map((type) => (
          <div key={type} data-testid={`watch-${type}`} className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
            <dt className="w-24 shrink-0 text-sm text-muted">{ACCESS_LABELS[type]}</dt>
            <dd className="flex flex-wrap gap-2">
              {watch[type].map((p) => (
                <span
                  key={p.id}
                  className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface py-1.5 pl-1.5 pr-3 text-sm"
                >
                  <ProviderLogo provider={p} size={28} />
                  {p.name}
                </span>
              ))}
            </dd>
          </div>
        ))}
      </dl>
      <p className="mt-3 text-xs text-muted">
        Dados de disponibilidade:{' '}
        <a href="https://www.justwatch.com/br" className="underline" target="_blank" rel="noreferrer">
          JustWatch
        </a>
      </p>
    </section>
  );
}
