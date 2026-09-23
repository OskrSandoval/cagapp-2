import { supabase } from '../auth/supabaseClient';

// AD-1: los baños solo se leen a través de la API de Node, nunca directo
// contra Supabase desde el frontend.
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
 * Pide los baños al backend: por ubicación (`lat` + `lng`, con distancia) o
 * por nombre de zona (`zona`, fallback cuando se niega la geolocalización).
 */
export async function obtenerBanosCercanos({ lat, lng, zona } = {}) {
  const token = await obtenerTokenActual();
  const parametros = new URLSearchParams();
  if (typeof lat === 'number' && typeof lng === 'number') {
    parametros.set('lat', String(lat));
    parametros.set('lng', String(lng));
  }
  if (zona) {
    parametros.set('zona', zona);
  }

  const MENSAJE_FALLBACK = 'No pudimos traer los baños 😬 — intenta de nuevo.';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/banos?${parametros.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error(MENSAJE_FALLBACK);
  }

  if (!respuesta.ok) {
    const error = await leerCuerpoError(respuesta);
    throw new Error(error || MENSAJE_FALLBACK);
  }

  try {
    return await respuesta.json();
  } catch {
    throw new Error(MENSAJE_FALLBACK);
  }
}

/**
 * Crea un baño nuevo (Story 2.4). `lat`/`lng` son la ubicación del
 * dispositivo ya resuelta por `Mapa.jsx` — nunca un campo editable ni un
 * picker de mapa.
 */
export async function crearBano({ nombre, zona, tipoLugar, lat, lng }) {
  const token = await obtenerTokenActual();
  const MENSAJE_FALLBACK = 'No pudimos crear el baño 😬 — intenta de nuevo.';

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}/banos`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ nombre, zona, tipo_lugar: tipoLugar, lat, lng }),
    });
  } catch {
    throw new Error(MENSAJE_FALLBACK);
  }

  if (!respuesta.ok) {
    const error = await leerCuerpoError(respuesta);
    throw new Error(error || MENSAJE_FALLBACK);
  }

  try {
    return await respuesta.json();
  } catch {
    throw new Error(MENSAJE_FALLBACK);
  }
}
