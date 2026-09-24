import { supabase } from '../auth/supabaseClient';

// AD-1: cualquier lectura/escritura de negocio (perfiles incluidos) pasa
// por la API de Node, nunca directo contra Supabase desde el frontend.
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
