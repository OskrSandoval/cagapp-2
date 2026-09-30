// Instala el modo demo local desde afuera de la app (sin tocar src/api,
// App.jsx ni las páginas). Solo lo importa `main.jsx`, por import dinámico
// y detrás de `import.meta.env.DEV && VITE_MODO_DEMO === 'true'`, así que
// `vite build` nunca lo incluye. Ver frontend/DEMO.md.
import { supabase } from '../auth/supabaseClient';
import { crearApiDemo } from './apiDemo.js';
import { SESION_DEMO, UBICACION_INICIAL } from './datosDemo.js';
import { crearGpsDemo } from './gpsDemo.js';

// Latencia artificial para que los estados de "cargando" se alcancen a ver.
const LATENCIA_MS = 150;

const COMANDOS = `CagApp — modo demo local (nada llega a Supabase ni al backend).
Comandos en window.cagappDemo:
  moverA(lat, lng, accuracy?)  mueve el GPS falso (inicio: ${UBICACION_INICIAL.lat}, ${UBICACION_INICIAL.lng})
  sacudirGps()                 re-emite la misma posición como un objeto nuevo
  fallarSiguiente('/banos')    la siguiente petición a esa ruta responde 500
  buzon(true|false)            prende o apaga el switch de sugerencias
  estado()                     perfiles, baños, check-ins, calificaciones y sugerencias en memoria`;

function urlDe(entrada) {
  if (typeof entrada === 'string') return entrada;
  if (entrada instanceof URL) return entrada.href;
  return entrada?.url ?? String(entrada);
}

function leerCuerpo(cuerpo) {
  if (typeof cuerpo !== 'string' || cuerpo === '') return undefined;
  try {
    return JSON.parse(cuerpo);
  } catch {
    return undefined;
  }
}

export function instalarDemo() {
  const apiUrl = String(import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');
  // Sin VITE_API_URL, src/api/* caería a http://localhost:3001 y le pegaría
  // al backend local real: mejor no arrancar.
  if (!apiUrl) {
    throw new Error('Modo demo: falta VITE_API_URL (ver frontend/.env.demo). No se instala la demo.');
  }
  const api = crearApiDemo();
  const gps = crearGpsDemo(UBICACION_INICIAL);

  // Sesión: la app entra directo al Mapa. `onAuthStateChange` nunca dispara.
  supabase.auth.getSession = async () => ({ data: { session: SESION_DEMO }, error: null });
  supabase.auth.getUser = async () => ({ data: { user: SESION_DEMO.user }, error: null });
  supabase.auth.onAuthStateChange = () => ({ data: { subscription: { unsubscribe() {} } } });
  supabase.auth.signOut = async () => ({ error: null });

  // API: solo las URLs de VITE_API_URL; el resto de `fetch` sigue siendo real.
  const fetchReal = window.fetch.bind(window);
  window.fetch = async (entrada, opciones = {}) => {
    const url = urlDe(entrada);
    if (!(url === apiUrl || url.startsWith(`${apiUrl}/`) || url.startsWith(`${apiUrl}?`))) {
      return fetchReal(entrada, opciones);
    }
    const metodo = opciones.method || (typeof entrada === 'object' && entrada?.method) || 'GET';
    const ruta = url.slice(apiUrl.length) || '/';
    await new Promise((resolver) => setTimeout(resolver, LATENCIA_MS));
    const { status, cuerpo } = api.manejarPeticion(metodo, ruta, leerCuerpo(opciones.body));
    return new Response(JSON.stringify(cuerpo), {
      status,
      headers: { 'Content-Type': 'application/json' },
    });
  };

  // GPS falso, controlable desde la consola.
  Object.defineProperty(navigator, 'geolocation', { value: gps.geolocation, configurable: true });

  window.cagappDemo = {
    moverA: (lat, lng, accuracy) => gps.moverA(lat, lng, accuracy),
    sacudirGps: () => gps.sacudir(),
    fallarSiguiente: (ruta) => api.fallarSiguiente(ruta),
    buzon: (activo) => api.buzon(activo),
    estado: () => ({ ...api.estado(), gps: gps.posicionActual() }),
  };

  document.title = `[DEMO] ${document.title}`;
  // eslint-disable-next-line no-console
  console.info(COMANDOS);
}
