// Datos semilla del modo demo local (`npm run dev:demo`). Viven solo en
// memoria: `apiDemo.js` los clona al arrancar y se reinician al recargar.
// Nada de esto existe en Supabase ni se usa en producción.

export const USUARIO_DEMO_ID = 'de000000-0000-4000-8000-000000000001';
const LUPITA_ID = 'de000000-0000-4000-8000-000000000002';
const BETO_ID = 'de000000-0000-4000-8000-000000000003';

// Punto de arranque del GPS falso: Roma Norte, cerca de la Plaza Río de
// Janeiro. `accuracy` de 15m, dentro del umbral confiable de 100m (AD-8).
export const UBICACION_INICIAL = { lat: 19.4195, lng: -99.162, accuracy: 15 };

export const SESION_DEMO = {
  access_token: 'token-demo',
  token_type: 'bearer',
  expires_in: 3600,
  refresh_token: 'refresh-demo',
  user: { id: USUARIO_DEMO_ID, email: 'demo@cagapp.local' },
};

const hace = (minutos) => new Date(Date.now() - minutos * 60 * 1000).toISOString();

export function crearPerfilesDemo() {
  return [
    { id: USUARIO_DEMO_ID, nombre_para_mostrar: 'Demo', autorizado: true, created_at: hace(60 * 24 * 30) },
    { id: LUPITA_ID, nombre_para_mostrar: 'Lupita', autorizado: true, created_at: hace(60 * 24 * 20) },
    { id: BETO_ID, nombre_para_mostrar: 'Beto', autorizado: true, created_at: hace(60 * 24 * 10) },
  ];
}

const idBano = (n) => `ba000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

// Distancias aproximadas desde UBICACION_INICIAL:
// 1 ≈ 78m (dentro del radio de check-in), 2 ≈ 178m (entre 150 y 200m),
// el resto a más de 500m.
export function crearBanosDemo() {
  return [
    {
      id: idBano(1),
      nombre: 'Café La Plaza',
      lat: 19.4202,
      lng: -99.162,
      tipo_lugar: 'Cafetería',
      zona: 'Roma Norte',
      creado_por: LUPITA_ID,
      created_at: hace(60 * 24 * 9),
    },
    {
      id: idBano(2),
      nombre: 'Librería Orizaba',
      lat: 19.4211,
      lng: -99.162,
      tipo_lugar: 'Librería',
      zona: 'Roma Norte',
      creado_por: BETO_ID,
      created_at: hace(60 * 24 * 8),
    },
    {
      id: idBano(3),
      nombre: 'Mercado de Medellín',
      lat: 19.4118,
      lng: -99.1636,
      tipo_lugar: 'Mercado',
      zona: 'Roma Sur',
      creado_por: LUPITA_ID,
      created_at: hace(60 * 24 * 7),
    },
    {
      id: idBano(4),
      nombre: 'Parque México (módulo)',
      lat: 19.4118,
      lng: -99.1695,
      tipo_lugar: 'Parque',
      zona: 'Condesa',
      creado_por: BETO_ID,
      created_at: hace(60 * 24 * 6),
    },
    {
      id: idBano(5),
      nombre: 'Foro Amsterdam',
      lat: 19.4145,
      lng: -99.174,
      tipo_lugar: 'Bar',
      zona: 'Condesa',
      creado_por: LUPITA_ID,
      created_at: hace(60 * 24 * 5),
    },
    {
      id: idBano(6),
      nombre: 'Glorieta Insurgentes',
      lat: 19.4235,
      lng: -99.158,
      tipo_lugar: 'Estación de metro',
      zona: 'Roma Norte',
      creado_por: BETO_ID,
      created_at: hace(60 * 24 * 4),
    },
  ];
}

// El usuario demo ya hizo check-in y calificó el Mercado de Medellín hace
// un día, para que Perfil arranque con actividad. El check-in ya expiró.
export function crearCheckinsDemo() {
  return [{ id: 'c0000000-0000-4000-8000-000000000001', usuario_id: USUARIO_DEMO_ID, 'baño_id': idBano(3), created_at: hace(60 * 24) }];
}

// Baños 1, 3 y 4 con calificaciones; 2, 5 y 6 sin ninguna.
export function crearCalificacionesDemo() {
  const filas = [
    [LUPITA_ID, 1, 5, 60 * 24 * 3],
    [BETO_ID, 1, 4, 60 * 24 * 2],
    [LUPITA_ID, 3, 2, 60 * 24 * 5],
    [USUARIO_DEMO_ID, 3, 4, 60 * 24],
    [BETO_ID, 4, 1, 60 * 5],
  ];
  return filas.map(([usuarioId, bano, estrellas, minutos], indice) => ({
    id: `ca000000-0000-4000-8000-${String(indice + 1).padStart(12, '0')}`,
    usuario_id: usuarioId,
    'baño_id': idBano(bano),
    estrellas,
    created_at: hace(minutos),
    secuencia: indice + 1,
  }));
}
