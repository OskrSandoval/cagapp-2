import { supabase } from '../auth/supabaseClient';

// AD-1: las calificaciones solo se registran a través de la API de Node,
// nunca directo contra Supabase desde el frontend.
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
 * Publica una calificación de 1-5 estrellas para un baño (Story 3.2), mismo
 * patrón de POST autenticado que `hacerCheckin`. El backend es la única
 * autoridad sobre "hay un check-in vigente" (ventana de 15 min) — un 403
 * aquí significa que ese check-in ya no cuenta, sin importar lo que muestre
 * la UI local; quien llama debe regresar al flujo de "Hacer check-in" en vez
 * de dejar el selector colgado (Design Notes de la spec).
 *
 * El error lanzado trae `status` (el código HTTP de la respuesta), mismo
 * criterio que `hacerCheckin`.
 */
export async function calificarBano({ banoId, estrellas }) {
  const token = await obtenerTokenActual();
  const MENSAJE_FALLBACK = 'No pudimos guardar tu calificación 😬 — intenta de nuevo.';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/calificaciones`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ bano_id: banoId, estrellas }),
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

/**
 * Story 4.2: trae la lista pública restringida de calificaciones de un baño
 * (`{ nombre_para_mostrar, estrellas, created_at }`, nunca `usuario_id` —
 * AD-11) para "Lo que dice la gente" en Detalle. Mismo patrón autenticado
 * que `calificarBano`, pero GET con `bano_id` en la query.
 */
export async function obtenerCalificacionesPublicas(banoId) {
  const token = await obtenerTokenActual();
  const MENSAJE_FALLBACK = 'No pudimos revisar las calificaciones de este baño 😬 — intenta de nuevo.';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/calificaciones?bano_id=${encodeURIComponent(banoId)}`, {
      headers: { Authorization: `Bearer ${token}` },
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
