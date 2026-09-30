import { API_URL, leerCuerpoError, obtenerTokenActual } from './cliente';

// AD-1: cualquier lectura/escritura de negocio (perfiles incluidos) pasa
// por la API de Node, nunca directo contra Supabase desde el frontend.

/**
 * Crea (o actualiza, si ya existe) el perfil del usuario autenticado.
 * Idempotente en el backend: reintentar nunca duplica ni falla.
 */
export async function crearPerfil(nombreParaMostrar) {
  const token = await obtenerTokenActual();
  const respuesta = await fetch(`${API_URL}/perfiles`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ nombre_para_mostrar: nombreParaMostrar }),
  });

  if (!respuesta.ok) {
    const error = await leerCuerpoError(respuesta);
    throw new Error(error || 'No pudimos guardar tu perfil 😬 — intenta de nuevo.');
  }

  return respuesta.json();
}

/**
 * Devuelve el perfil del usuario autenticado, o null si todavía no existe
 * (404 del backend) para que la app le pida completar su nombre.
 */
export async function obtenerMiPerfil() {
  const token = await obtenerTokenActual();
  const respuesta = await fetch(`${API_URL}/perfiles/yo`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (respuesta.status === 404) {
    return null;
  }

  if (!respuesta.ok) {
    const error = await leerCuerpoError(respuesta);
    throw new Error(error || 'No pudimos revisar tu perfil 😬 — intenta de nuevo.');
  }

  return respuesta.json();
}

/**
 * Devuelve la actividad propia (baños en los que hice check-in + mi
 * calificación vigente en cada uno) del usuario autenticado — mismo patrón
 * que `obtenerMiPerfil`. Nunca hay parámetros: el backend siempre resuelve
 * el usuario desde el JWT.
 */
export async function obtenerMiActividad() {
  const token = await obtenerTokenActual();
  const respuesta = await fetch(`${API_URL}/perfiles/yo/actividad`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!respuesta.ok) {
    const error = await leerCuerpoError(respuesta);
    throw new Error(error || 'No pudimos revisar tu actividad 😬 — intenta de nuevo.');
  }

  return respuesta.json();
}
