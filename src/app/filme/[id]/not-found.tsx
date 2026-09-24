import Link from 'next/link';

export default function MovieNotFound() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-lg">Filme não encontrado.</p>
      <p className="mt-1 text-sm text-muted">Ele pode ter saído de todos os streamings.</p>
      <Link href="/" className="mt-4 inline-block text-fg underline hover:text-accent">
        Voltar ao início
      </Link>
    </main>
  );
}
