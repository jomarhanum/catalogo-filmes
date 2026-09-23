'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { CATALOG_QUERY_KEY } from '@/components/catalog/MovieGrid';

function savedQuery(): string {
  try {
    return sessionStorage.getItem(CATALOG_QUERY_KEY) ?? '';
  } catch {
    return '';
  }
}

export function BackLink() {
  const router = useRouter();
  return (
    <Link
      href="/"
      onClick={(e) => {
        const query = savedQuery();
        if (query) {
          e.preventDefault();
          router.push(`/?${query}`);
        }
      }}
      className="text-sm text-muted hover:text-fg"
    >
      ← Voltar ao catálogo
    </Link>
  );
}
