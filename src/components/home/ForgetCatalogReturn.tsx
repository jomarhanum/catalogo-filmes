'use client';

import { useEffect } from 'react';
import { takeReturnFromFilm } from '@/components/catalog/catalogSession';

// Montado na vitrine: apaga a marca de "filme aberto pelo catálogo", como a busca já faz.
// Assim, um clique posterior em "Catálogo" no topo não reabre uma lista e uma rolagem antigas.
export function ForgetCatalogReturn() {
  useEffect(() => {
    takeReturnFromFilm();
  }, []);
  return null;
}
