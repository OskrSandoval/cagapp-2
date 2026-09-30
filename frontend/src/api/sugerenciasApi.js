import { API_URL, leerCuerpoError, obtenerTokenActual } from './cliente';

// AD-1: las sugerencias solo pasan por la API de Node, nunca directo contra
// Supabase desde el frontend.

/**
 * Manda un bug o una sugerencia. El usuario y la fecha los pone
 * el servidor — el body solo lleva `{ tipo, texto }`.
 */
export async function enviarSugerencia({ tipo, texto }) {
  const token = await obtenerTokenActual();
  const MENSAJE_FALLBACK = 'No pudimos mandar tu mensaje 😬 — intenta de nuevo.';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/sugerencias`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ tipo, texto }),
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
 * Switch de la fase "friends and family": devuelve `true` solo si el
 * backend responde `{ activas: true }`. Cualquier otra cosa lanza o
 * devuelve `false` — quien llama oculta el botón en ambos casos.
 */
export async function obtenerEstadoSugerencias() {
  const token = await obtenerTokenActual();
  const respuesta = await fetch(`${API_URL}/sugerencias/estado`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!respuesta.ok) {
    throw new Error('No pudimos revisar el buzón 😬');
  }

  const cuerpo = await respuesta.json();
  return cuerpo?.activas === true;
}
