// Marca, na aba (sessionStorage), que um filme foi aberto por um link de dentro do site.
// O "Voltar" da página do filme usa isso para voltar pelo histórico em vez de sair do site.
const KEY = 'film-opened-from-site';

export function markFilmOpenedFromSite(path: string): void {
  try {
    sessionStorage.setItem(KEY, path);
  } catch {
    // Sem sessionStorage: o "Voltar" cai no comportamento simples.
  }
}

export function filmOpenedFromSite(path: string): boolean {
  try {
    return sessionStorage.getItem(KEY) === path;
  } catch {
    return false;
  }
}

export function clearFilmOpenedFromSite(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // nada a limpar
  }
}

/**
 * Lê e sempre limpa a marca (evita que ela fique "presa": se a pessoa sair da página do filme sem
 * clicar em "Voltar" — ex. botão nativo do navegador — a marca não seria limpa e poderia fazer um
 * "Voltar" futuro, num filme aberto por link direto, sequestrar o histórico indevidamente).
 */
export function takeFilmOpenedFromSite(path: string): boolean {
  try {
    const matches = sessionStorage.getItem(KEY) === path;
    sessionStorage.removeItem(KEY);
    return matches;
  } catch {
    return false;
  }
}

interface ClickLike {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

/** Clique simples com o botão principal (sem abrir em nova aba/janela). */
export function isPlainLeftClick(e: ClickLike): boolean {
  return e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;
}
