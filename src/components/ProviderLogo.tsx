import Image from 'next/image';
import type { ProviderRef } from '@/lib/queries/types';
import { tmdbImage } from '@/lib/tmdb-image';

export function ProviderLogo({ provider, size }: { provider: ProviderRef; size: number }) {
  const src = tmdbImage(provider.logoPath, 'w92');
  if (!src) {
    return (
      <span
        title={provider.name}
        style={{ width: size, height: size }}
        className="inline-flex items-center justify-center rounded bg-surface text-[10px] font-semibold text-muted"
      >
        {provider.name.slice(0, 2)}
      </span>
    );
  }
  return (
    <Image src={src} alt={provider.name} title={provider.name} width={size} height={size} className="rounded" />
  );
}
