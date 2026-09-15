import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Valores dummy para que datos/supabaseAdmin.js pueda construir un
    // cliente sin fallar al importarse en los tests; ningún test le pega
    // a Supabase real (se mockea o se inyecta un cliente falso).
    env: {
      SUPABASE_URL: 'https://example.supabase.co',
      SUPABASE_SERVICE_ROLE_KEY: 'test-service-role-key',
      FRONTEND_ORIGIN: 'http://localhost:5173',
    },
  },
});
