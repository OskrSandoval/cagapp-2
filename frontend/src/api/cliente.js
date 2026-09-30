import { supabase } from '../auth/supabaseClient';

// AD-1: todo dato de negocio pasa por la API de Node, nunca directo contra
// Supabase desde el frontend. Supabase solo aporta el token de la sesión.
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

export async function obtenerTokenActual() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No hay sesión activa — vuelve a iniciar sesión 🔐');
  }
  return token;
}

// Los errores del backend llegan como `{ error }` (AD-7); si el cuerpo no es
// JSON (proxy, 502, etc.) quien llama cae a su propio mensaje de marca.
export async function leerCuerpoError(respuesta) {
  try {
    const cuerpo = await respuesta.json();
    return cuerpo?.error;
  } catch {
    return null;
  }
}
