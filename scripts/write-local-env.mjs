// Gera .env.local com as chaves do Supabase local, preservando TMDB_API_TOKEN se já existir.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const status = JSON.parse(execSync('npx supabase status -o json', { encoding: 'utf8' }));
const kept = existsSync('.env.local')
  ? readFileSync('.env.local', 'utf8').split(/\r?\n/).filter((line) => line.startsWith('TMDB_API_TOKEN='))
  : [];

const lines = [
  `NEXT_PUBLIC_SUPABASE_URL=${status.API_URL}`,
  `NEXT_PUBLIC_SUPABASE_ANON_KEY=${status.ANON_KEY}`,
  `SUPABASE_URL=${status.API_URL}`,
  `SUPABASE_SERVICE_ROLE_KEY=${status.SERVICE_ROLE_KEY}`,
  ...kept,
];
writeFileSync('.env.local', lines.join('\n') + '\n');
console.log('.env.local atualizado');
