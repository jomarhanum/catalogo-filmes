import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Sobre' };

export default function SobrePage() {
  return (
    <main className="mx-auto max-w-2xl space-y-4 px-4 py-10 leading-relaxed">
      <h1 className="text-2xl font-bold">Sobre</h1>
      <p>
        Este catálogo mostra quais filmes estão disponíveis agora nos streamings do Brasil, por assinatura,
        aluguel ou compra. Os dados são atualizados uma vez por dia.
      </p>
      <p>
        Dados de filmes fornecidos pelo{' '}
        <a href="https://www.themoviedb.org/" className="underline" target="_blank" rel="noreferrer">
          TMDB
        </a>
        . This product uses the TMDB API but is not endorsed or certified by TMDB.
      </p>
      <p>
        Dados de disponibilidade nos streamings fornecidos pelo{' '}
        <a href="https://www.justwatch.com/br" className="underline" target="_blank" rel="noreferrer">
          JustWatch
        </a>
        .
      </p>
    </main>
  );
}
