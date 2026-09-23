'use client';

export default function ErrorPage({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-lg">Não conseguimos carregar o catálogo agora.</p>
      <button
        type="button"
        onClick={retry}
        className="mt-4 rounded-md bg-accent px-4 py-2 font-semibold text-black"
      >
        Tentar de novo
      </button>
    </main>
  );
}
