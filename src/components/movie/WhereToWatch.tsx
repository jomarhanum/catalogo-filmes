import { ProviderLogo } from '@/components/ProviderLogo';
import { ACCESS_LABELS, ACCESS_TYPES } from '@/lib/filters';
import type { MovieDetails } from '@/lib/queries/types';

export function WhereToWatch({ watch }: { watch: MovieDetails['watch'] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 pb-10" aria-labelledby="onde-assistir">
      <h2 id="onde-assistir" className="text-xs font-semibold uppercase tracking-wider text-muted">
        Onde assistir no Brasil
      </h2>
      <dl className="mt-3 space-y-3">
        {ACCESS_TYPES.filter((type) => watch[type].length > 0).map((type) => (
          <div key={type} data-testid={`watch-${type}`} className="flex items-center gap-3">
            <dt className="w-24 text-sm text-muted">{ACCESS_LABELS[type]}</dt>
            <dd className="flex flex-wrap gap-2">
              {watch[type].map((p) => (
                <ProviderLogo key={p.id} provider={p} size={40} />
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
