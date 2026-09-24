'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { isPlainLeftClick, markFilmOpenedFromSite } from '@/lib/navigation-origin';

interface Props {
  href: string;
  className?: string;
  children: ReactNode;
  'data-testid'?: string;
}

export function FilmLink({ href, className, children, 'data-testid': testId }: Props) {
  return (
    <Link
      href={href}
      data-testid={testId}
      className={className}
      onClick={(e) => {
        if (isPlainLeftClick(e)) markFilmOpenedFromSite(href);
      }}
    >
      {children}
    </Link>
  );
}
