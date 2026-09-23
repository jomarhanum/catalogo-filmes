import Link from 'next/link';

export default function NotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-lg">Não encontramos essa página.</p>
      <Link href="/" className="mt-4 inline-block text-accent underline">
        Voltar ao catálogo
      </Link>
    </main>
  );
}
