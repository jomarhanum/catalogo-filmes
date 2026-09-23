export function formatYear(date: string | null): string | null {
  return date ? date.slice(0, 4) : null;
}

export function formatRuntime(minutes: number | null): string | null {
  if (!minutes || minutes <= 0) return null;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest}min`;
  if (rest === 0) return `${hours}h`;
  return `${hours}h${String(rest).padStart(2, '0')}`;
}

const ratingFormat = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

export function formatRating(value: number): string {
  return ratingFormat.format(value);
}

export function formatMovieCount(total: number): string {
  return `${total.toLocaleString('pt-BR')} ${total === 1 ? 'filme' : 'filmes'}`;
}
