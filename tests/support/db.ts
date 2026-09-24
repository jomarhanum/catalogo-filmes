import { createClient } from '@supabase/supabase-js';
import type { Database } from '@/lib/supabase/database.types';

function env(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} não definida. Rode "npx supabase start" e "npm run env:local".`);
  return value;
}

export function anonDb() {
  return createClient<Database>(env('NEXT_PUBLIC_SUPABASE_URL'), env('NEXT_PUBLIC_SUPABASE_ANON_KEY'), {
    auth: { persistSession: false },
  });
}

export function serviceDb() {
  return createClient<Database>(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false },
  });
}
