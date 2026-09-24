import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Imagens vêm prontas do CDN do TMDB; não gastamos a cota de otimização da Vercel.
  images: { unoptimized: true },
};

export default nextConfig;
