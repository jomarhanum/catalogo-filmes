'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { filmOpenedFromCatalog, savedQuery } from '@/components/catalog/catalogSession';

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/catalogo"
      onClick={(e) => {
        // Veio de um card do catálogo nesta aba: volta pelo histórico (mantém filtros, blocos e rolagem).
        if (filmOpenedFromCatalog(window.location.pathname)) {
          e.preventDefault();
          router.back();
          return;
        }
        const query = savedQuery();
        if (query) {
          e.preventDefault();
          router.push(`/catalogo?${query}`);
        }
      }}
      className="text-sm text-muted hover:text-fg"
    >
      ← Voltar ao catálogo
    </Link>
  );
}
