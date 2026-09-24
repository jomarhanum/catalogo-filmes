import { redirect } from 'next/navigation';
import { catalogRedirectTarget, type RawSearchParams } from '@/lib/filters';

export default async function HomePage({ searchParams }: { searchParams: Promise<RawSearchParams> }) {
  redirect(catalogRedirectTarget(await searchParams) ?? '/catalogo');
}
