import { createClient } from '@supabase/supabase-js';

// AD-1: el frontend solo usa el SDK de Supabase para registro/login/sesión.
// Cualquier otra lectura/escritura de negocio (ej. perfiles) pasa por la API
// del backend en src/api, nunca directo contra Supabase desde aquí.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  // eslint-disable-next-line no-console
  console.error(
    'Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. Copia frontend/.env.example a frontend/.env y llena tus llaves de Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
