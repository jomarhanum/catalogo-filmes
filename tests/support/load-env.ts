// Carrega .env.local (gerado por scripts/write-local-env.mjs) nos testes de integração.
try {
  process.loadEnvFile('.env.local');
} catch {
  // No CI o arquivo também é gerado; se faltar, os testes falham com mensagem clara em tests/support/db.ts.
}
