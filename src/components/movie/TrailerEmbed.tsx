'use client';

import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';

// Mostra a miniatura do YouTube e só carrega o player quando a pessoa pede.
export function TrailerEmbed({ trailerKey, title }: { trailerKey: string; title: string }) {
  const [playing, setPlaying] = useState(false);
  const playerRef = useRef<HTMLIFrameElement>(null);

  // O botão focado some ao reproduzir; o foco vai para o player em vez de cair no <body>.
  useEffect(() => {
    if (playing) playerRef.current?.focus();
  }, [playing]);
  const key = encodeURIComponent(trailerKey);

  return (
    <section aria-labelledby="trailer" className="mt-10">
      <h2
        id="trailer"
        className="flex items-center gap-2.5 font-display text-lg font-bold before:h-5 before:w-1 before:rounded-full before:bg-accent"
      >
        Trailer
      </h2>
      <div className="relative mt-4 aspect-video max-w-3xl overflow-hidden rounded-lg border border-border bg-black">
        {playing ? (
          <iframe
            ref={playerRef}
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${key}?autoplay=1`}
            title={`Trailer de ${title}`}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button
            type="button"
            aria-label={`Reproduzir trailer de ${title}`}
            onClick={() => setPlaying(true)}
            className="group absolute inset-0"
          >
            <Image
              src={`https://i.ytimg.com/vi/${key}/hqdefault.jpg`}
              alt=""
              fill
              sizes="(max-width: 768px) 100vw, 768px"
              className="object-cover opacity-75 transition-opacity group-hover:opacity-100"
            />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex items-center gap-2 rounded-full bg-black/75 px-5 py-3 font-semibold">
                <span aria-hidden="true">▶</span> Reproduzir trailer
              </span>
            </span>
          </button>
        )}
      </div>
    </section>
  );
}
