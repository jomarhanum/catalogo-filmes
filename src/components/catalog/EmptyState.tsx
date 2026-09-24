import Link from 'next/link';

export function EmptyState() {
  return (
    <div className="py-16 text-center">
      <p className="text-lg">Nenhum filme encontrado</p>
      <p className="mt-1 text-sm text-muted">Tente tirar alguns filtros.</p>
      <Link href="/catalogo" className="mt-4 inline-block rounded-md bg-accent px-4 py-2 font-semibold text-white">
        Limpar filtros
      </Link>
    </div>
  );
}
