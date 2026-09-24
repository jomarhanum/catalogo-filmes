import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FeaturedHero } from '@/components/home/FeaturedHero';
import { MovieRow } from '@/components/home/MovieRow';
import { catalogRedirectTarget, type RawSearchParams } from '@/lib/filters';
import { seeAllHref } from '@/lib/home-rows';
import { getFeaturedMovie } from '@/lib/queries/featured';
import { getHomeRows } from '@/lib/queries/homeRows';
import { createServerSupabase } from '@/lib/supabase/server';

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  const target = catalogRedirectTarget(await searchParams);
  if (target) redirect(target);

  const db = createServerSupabase();
  const [featured, rows] = await Promise.all([getFeaturedMovie(db), getHomeRows(db)]);

  if (!featured && rows.length === 0) {
    return (
      <main className="px-4 py-24 text-center sm:px-8">
        <p className="text-lg">O catálogo ainda está sendo carregado. Volte em alguns minutos.</p>
        <Link href="/catalogo" className="mt-4 inline-block text-accent underline">
          Ver o catálogo
        </Link>
      </main>
    );
  }

  return (
    <main className="pb-12">
      {featured && <FeaturedHero movie={featured} />}
      <div className={featured ? 'relative z-10 -mt-24 space-y-8 sm:-mt-32' : 'space-y-8 pt-6'}>
        {rows.map(({ row, movies }) => (
          <MovieRow key={row.id} title={row.title} href={seeAllHref(row)} movies={movies} />
        ))}
      </div>
    </main>
  );
}
