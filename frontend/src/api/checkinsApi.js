import { supabase } from '../auth/supabaseClient';

// AD-1: los check-in solo se registran a través de la API de Node, nunca
// directo contra Supabase desde el frontend.
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001';

async function obtenerTokenActual() {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) {
    throw new Error('No hay sesión activa — vuelve a iniciar sesión 🔐');
  }
  return token;
}

async function leerCuerpoError(respuesta) {
  try {
    const cuerpo = await respuesta.json();
    return cuerpo?.error;
  } catch {
    return null;
  }
}

/**
 * Hace check-in en un baño (Story 3.1), mismo patrón de POST autenticado que
 * `crearBano`. `lat`/`lng`/`accuracy` deben ser una lectura fresca de
 * geolocalización capturada al tocar el botón (nunca la ubicación ya
 * cacheada del mapa) — el backend es la única autoridad sobre "dentro de
 * rango" (AD-8), esta capa solo transporta el intento.
 *
 * El error lanzado trae `status` (el código HTTP de la respuesta) para que
 * quien llama distinga fuera de rango (403) de precisión insuficiente (422)
 * sin tener que adivinar por el texto del mensaje (Design Notes de la spec).
 */
export async function hacerCheckin({ banoId, lat, lng, accuracy }) {
  const token = await obtenerTokenActual();
  const MENSAJE_FALLBACK = 'No pudimos registrar tu check-in 😬 — intenta de nuevo.';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/checkins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bano_id: banoId, lat, lng, accuracy }),
    });
  } catch {
    throw new Error(MENSAJE_FALLBACK);
  }

  if (!respuesta.ok) {
    const mensaje = await leerCuerpoError(respuesta);
    const error = new Error(mensaje || MENSAJE_FALLBACK);
    error.status = respuesta.status;
    throw error;
  }

  try {
    return await respuesta.json();
  } catch {
    throw new Error(MENSAJE_FALLBACK);
  }
}
