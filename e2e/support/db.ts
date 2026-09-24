import { createClient } from '@supabase/supabase-js';

try {
  process.loadEnvFile('.env.local');
} catch {
  // No CI o arquivo é gerado por `npm run env:local` antes dos testes.
}

export function serviceDb() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error('SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY ausentes: rode `npm run env:local`.');
  return createClient(url, key, { auth: { persistSession: false } });
}
