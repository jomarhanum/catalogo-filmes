'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { filmOpenedFromCatalog } from '@/components/catalog/catalogSession';
import { clearFilmOpenedFromSite, filmOpenedFromSite } from '@/lib/navigation-origin';

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/"
      onClick={(e) => {
        // Aberto por um link de dentro do site nesta aba: volta pelo histórico (vitrine, catálogo
        // com filtros e rolagem, ou busca). Aberto de fora: vai para a vitrine.
        const path = window.location.pathname;
        if (filmOpenedFromSite(path) || filmOpenedFromCatalog(path)) {
          e.preventDefault();
          clearFilmOpenedFromSite();
          router.back();
        }
      }}
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
    >
      <span aria-hidden="true">‹</span> Voltar
    </Link>
  );
}
