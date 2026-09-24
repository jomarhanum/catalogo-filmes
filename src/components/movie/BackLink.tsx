'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { filmOpenedFromCatalog } from '@/components/catalog/catalogSession';
import { takeFilmOpenedFromSite } from '@/lib/navigation-origin';

export function BackLink() {
  const router = useRouter();
  // Decide a origem uma vez, ao montar — não a cada clique: se a pessoa sair da página sem clicar
  // em "Voltar" (ex. botão nativo do navegador), a marca de "aberto pelo site" não fica presa para
  // um acesso direto/favoritado posterior a este mesmo filme.
  const cameFromSite = useRef(false);

  useEffect(() => {
    const path = window.location.pathname;
    // `||` preserva `true` na segunda execução do efeito em modo StrictMode (dev): a marca já foi
    // consumida na primeira execução, então a segunda não pode rebaixar `cameFromSite` para `false`.
    cameFromSite.current = cameFromSite.current || takeFilmOpenedFromSite(path) || filmOpenedFromCatalog(path);
  }, []);

  return (
    <Link
      href="/"
      onClick={(e) => {
        // Aberto por um link de dentro do site nesta aba: volta pelo histórico (vitrine, catálogo
        // com filtros e rolagem, ou busca). Aberto de fora: vai para a vitrine.
        if (cameFromSite.current) {
          e.preventDefault();
          router.back();
        }
      }}
      className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
    >
      <span aria-hidden="true">‹</span> Voltar
    </Link>
  );
}
