import 'server-only';
import { createClient } from '@supabase/supabase-js';
import type { Db } from '@/lib/queries/types';
import type { Database } from './database.types';

export function createServerSupabase(): Db {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY são obrigatórias');
  return createClient<Database>(url, key, { auth: { persistSession: false } });
}
