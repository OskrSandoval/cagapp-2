import { createClient } from '@supabase/supabase-js';

// AD-1 / AD-9: única capa que habla con Supabase usando la service role key.
// Nunca se importa desde rutas/controladores directamente (capas: rutas →
// controladores → servicios → datos).
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY. Copia backend/.env.example a backend/.env y llena tus llaves de Supabase.'
  );
  // Sin estas variables, createClient() truena con un stack trace crudo del
  // SDK — mejor terminar aquí con un mensaje claro.
  process.exit(1);
}

export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});
