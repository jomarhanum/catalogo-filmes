import { createClient } from '@supabase/supabase-js';
import type { Database } from '../src/lib/supabase/database.types';
import { createSupabaseRepository } from './supabase-repository';
import { runSync } from './sync';
import { createTmdbClient } from './tmdb';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Variável ${name} não definida`);
  return value;
}

async function main() {
  const started = Date.now();
  const db = createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
  await runSync({
    tmdb: createTmdbClient({ token: env('TMDB_API_TOKEN') }),
    repo: createSupabaseRepository(db),
    log: (msg) => console.log(`[sync] ${msg}`),
  });
  console.log(`[sync] concluído em ${Math.round((Date.now() - started) / 1000)}s`);
}

main().catch((error: unknown) => {
  console.error('[sync] falhou:', error);
  process.exit(1);
});
