import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

// Guards the perf fix in supabase/migrations/20260923000200_search_perf.sql:
// public.search_movies pins `set plan_cache_mode = force_custom_plan` so every
// call is planned against its real argument values instead of depending on
// Postgres's "custom plan for 5 calls, generic if cheaper" heuristic, which
// could otherwise silently regress to the multi-second Nested Loop plan as
// the catalog grows and PostgREST/Supavisor backends accumulate calls with
// every parameter shape. See the migration's header comment for the full
// root-cause writeup.
//
// PostgREST only exposes the `public`/`graphql_public` schemas (see
// supabase/config.toml), so pg_catalog.pg_proc isn't reachable through the
// anon/service RPC surface used by the rest of the test suite. This checks
// proconfig directly via `psql` inside the local supabase_db container
// instead. If Docker isn't reachable from the test runner, the check is
// skipped (not failed) rather than blocking the suite.
function findSupabaseDbContainer(): string | null {
  try {
    const names = execFileSync('docker', ['ps', '--filter', 'name=supabase_db', '--format', '{{.Names}}'], {
      encoding: 'utf8',
    })
      .trim()
      .split('\n')
      .filter(Boolean);
    return names[0] ?? null;
  } catch {
    return null;
  }
}

const container = findSupabaseDbContainer();

describe.skipIf(!container)('search_movies: proconfig trava plan_cache_mode', () => {
  it('proconfig contém plan_cache_mode=force_custom_plan', () => {
    const proconfig = execFileSync(
      'docker',
      [
        'exec',
        container as string,
        'psql',
        '-U',
        'postgres',
        '-d',
        'postgres',
        '-tAc',
        "select proconfig from pg_proc where proname = 'search_movies' and pronamespace = 'public'::regnamespace",
      ],
      { encoding: 'utf8' },
    ).trim();

    expect(proconfig).toContain('plan_cache_mode=force_custom_plan');
  });
});

if (!container) {
  console.warn(
    'search_movies.planCacheMode: contêiner supabase_db não encontrado via `docker ps` — verificação de proconfig pulada.',
  );
}
