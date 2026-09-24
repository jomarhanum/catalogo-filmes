'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

interface Props {
  trailerKey: string;
  title: string;
  triggerLabel?: string;
  triggerClassName?: string;
}

export function TrailerModal({
  trailerKey,
  title,
  triggerLabel = 'Ver trailer',
  triggerClassName = 'mt-4 rounded-md bg-accent px-4 py-2 font-bold text-white',
}: Props) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // Ao abrir, o foco vai para o diálogo; Esc fecha e o foco volta para o botão que abriu.
  useEffect(() => {
    if (!open) return;
    dialogRef.current?.focus();
    const trigger = triggerRef.current;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      trigger?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        <span aria-hidden="true">▶</span> {triggerLabel}
      </button>
      {/* O diálogo vai direto para o <body>: quem usa o botão pode estar dentro de uma camada
          isolada (o destaque da vitrine usa `isolate`), e aí o `fixed z-50` ficaria preso nela,
          abaixo das fileiras e do topo fixo. */}
      {open &&
        createPortal(
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-label={`Trailer de ${title}`}
            tabIndex={-1}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 outline-none"
            onClick={() => setOpen(false)}
          >
            <div className="w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
              <div className="mb-2 text-right">
                <button type="button" onClick={() => setOpen(false)} className="text-sm underline">
                  Fechar ✕
                </button>
              </div>
              <div className="aspect-video">
                <iframe
                  className="h-full w-full rounded-lg"
                  src={`https://www.youtube-nocookie.com/embed/${encodeURIComponent(trailerKey)}?autoplay=1`}
                  title={`Trailer de ${title}`}
                  allow="autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
