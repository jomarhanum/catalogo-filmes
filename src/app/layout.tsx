import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'Catálogo — o que tem nos streamings', template: '%s · Catálogo' },
  description: 'Descubra quais filmes estão disponíveis agora nos streamings do Brasil e como assistir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-bg text-fg antialiased">
        <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="text-lg font-extrabold text-accent">
            🎬 Catálogo
          </Link>
          <span className="text-sm text-muted">Brasil</span>
        </header>
        {children}
        <footer className="mx-auto max-w-6xl px-4 py-8 text-xs text-muted">
          Dados: TMDB e JustWatch ·{' '}
          <Link href="/sobre" className="underline">
            Sobre
          </Link>
        </footer>
      </body>
    </html>
  );
}
