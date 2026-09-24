import type { Metadata } from 'next';
import { Inter, Outfit } from 'next/font/google';
import Link from 'next/link';
import { SiteHeader } from '@/components/layout/SiteHeader';
import './globals.css';

const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-inter', display: 'swap' });
const outfit = Outfit({ subsets: ['latin'], weight: ['500', '700', '800'], variable: '--font-outfit', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'CineCatálogo — o que tem nos streamings', template: '%s · CineCatálogo' },
  description: 'Descubra quais filmes estão disponíveis agora nos streamings do Brasil e como assistir.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={`${inter.variable} ${outfit.variable}`}>
      <body className="min-h-screen bg-bg font-sans text-fg antialiased">
        <SiteHeader />
        <div className="pt-16">{children}</div>
        <footer className="px-4 py-8 text-xs text-muted sm:px-8">
          Dados: TMDB e JustWatch ·{' '}
          <Link href="/sobre" className="underline">
            Sobre
          </Link>
        </footer>
      </body>
    </html>
  );
}
