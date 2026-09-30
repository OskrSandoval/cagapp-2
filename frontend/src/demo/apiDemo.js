// API en memoria del modo demo local. Imita formas, códigos de estado y
// mensajes de `backend/src/controladores/*` y `backend/src/servicios/*`
// (la fuente de verdad); si el backend cambia, esto se tiene que alinear a
// mano. Pura y sin I/O: `manejarPeticion(metodo, ruta, cuerpo)` devuelve
// `{ status, cuerpo }` y `instalarDemo.js` lo envuelve en un `Response`.
import {
  USUARIO_DEMO_ID,
  crearBanosDemo,
  crearCalificacionesDemo,
  crearCheckinsDemo,
  crearPerfilesDemo,
} from './datosDemo.js';

// Haversine propio: esto es un backend falso de desarrollo; AD-4 (Haversine
// único) aplica al código de producción, no a este módulo.
const RADIO_TIERRA_METROS = 6371000;
const aRadianes = (grados) => (grados * Math.PI) / 180;

export function calcularDistanciaMetros(a, b) {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Mismas reglas y orden que `checkinsService.evaluarDistanciaCheckin` (AD-8).
const RADIO_CHECKIN_METROS = 150;
const ACCURACY_MAXIMA_CONFIABLE = 100;
const VENTANA_CHECKIN_MS = 15 * 60 * 1000;
const MAX_CARACTERES_SUGERENCIA = 2000;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function evaluarDistanciaCheckin({ lat, lng, accuracy }, bano) {
  const distanciaReal = calcularDistanciaMetros({ lat, lng }, { lat: bano.lat, lng: bano.lng });
  const distanciaMinima = distanciaReal - accuracy;
  if (distanciaMinima > RADIO_CHECKIN_METROS) return 'fuera_de_rango';
  if (accuracy > ACCURACY_MAXIMA_CONFIABLE) return 'precision_insuficiente';
  return 'valido';
}

export const MENSAJES = {
  coordenadasQuery: 'Esas coordenadas no cuadran 🧭 — manda lat y lng válidas.',
  sinUbicacionNiZona: 'Dime dónde buscar 📍 — manda tu ubicación (lat y lng) o una zona.',
  errorBanos: 'No pudimos traer los baños 😬 — intenta de nuevo.',
  sinNombre: '¿Cómo se llama el baño? Escribe un nombre 🚽.',
  nombreLargo: 'Ese nombre está muy largo 📏 — máximo 100 caracteres.',
  sinZona: 'Dinos en qué zona o colonia está 📍.',
  zonaLarga: 'Esa zona está muy larga 📏 — máximo 100 caracteres.',
  sinTipo: 'Dinos qué tipo de lugar es 🏷️.',
  tipoLargo: 'Ese tipo de lugar está muy largo 📏 — máximo 100 caracteres.',
  coordenadasCuerpo: 'Esas coordenadas no cuadran 🧭 — necesitamos tu ubicación válida.',
  errorCrearBano: 'No pudimos crear el baño 😬 — intenta de nuevo.',
  sinBanoId: 'Necesitamos saber de qué baño hablamos 🚽.',
  banoIdInvalido: 'Ese id de baño no cuadra 🧐 — intenta de nuevo.',
  accuracyInvalida: 'Esa precisión de GPS no cuadra 📡 — intenta de nuevo.',
  banoNoEncontrado: 'Ese baño ya no existe o no lo encontramos 🚽❓.',
  fueraDeRango: 'Estás fuera de rango 📏 — tienes que estar a menos de 150m del baño para hacer check-in.',
  precisionInsuficiente:
    'Tu GPS anda medio perdido 📡 — no podemos confirmar que estés a menos de 150m. Intenta de nuevo.',
  errorCheckin: 'No pudimos registrar tu check-in 😬 — intenta de nuevo.',
  estrellasInvalidas: 'Elige entre 1 y 5 estrellas ⭐ — nada de medias tintas.',
  sinCheckinVigente:
    'Necesitas hacer check-in aquí antes de calificar 🕵️ — o tu check-in ya expiró, vuelve a intentarlo.',
  errorCalificar: 'No pudimos guardar tu calificación 😬 — intenta de nuevo.',
  errorCalificaciones: 'No pudimos revisar las calificaciones de este baño 😬 — intenta de nuevo.',
  sinNombrePerfil: 'Necesitamos saber cómo te llamamos 🙋 — manda tu nombre para mostrar.',
  errorPerfil: 'No pudimos revisar tu perfil 😬 — intenta de nuevo.',
  errorGuardarPerfil: 'No pudimos guardar tu perfil 😬 — intenta de nuevo.',
  sinPerfil: 'Todavía no tienes perfil por aquí 🤷',
  errorActividad: 'No pudimos revisar tu actividad 😬 — intenta de nuevo.',
  buzonCerrado: 'El buzón de sugerencias ya cerró 📪 — ¡gracias por la buena onda!',
  tipoSugerenciaInvalido: '¿Es un bug o una sugerencia? 🤔 — elige una de las dos.',
  textoVacio: 'Cuéntanos algo 💬 — el mensaje no puede ir vacío.',
  textoLargo: `Te inspiraste 📜 — máximo ${MAX_CARACTERES_SUGERENCIA} caracteres.`,
  errorSugerencia: 'No pudimos mandar tu mensaje 😬 — intenta de nuevo.',
  errorEstadoBuzon: 'No pudimos revisar el buzón 😬 — intenta de nuevo.',
  rutaDesconocida: 'Esa ruta no existe en la API demo 🤷',
};

// Mensaje del 500 que respondería el controlador real en cada ruta.
const MENSAJE_500 = {
  'GET /banos': MENSAJES.errorBanos,
  'POST /banos': MENSAJES.errorCrearBano,
  'POST /checkins': MENSAJES.errorCheckin,
  'GET /calificaciones': MENSAJES.errorCalificaciones,
  'POST /calificaciones': MENSAJES.errorCalificar,
  'POST /perfiles': MENSAJES.errorGuardarPerfil,
  'GET /perfiles/yo': MENSAJES.errorPerfil,
  'GET /perfiles/yo/actividad': MENSAJES.errorActividad,
  'GET /sugerencias/estado': MENSAJES.errorEstadoBuzon,
  'POST /sugerencias': MENSAJES.errorSugerencia,
};

const respuesta = (status, cuerpo) => ({ status, cuerpo });
const error = (status, mensaje) => respuesta(status, { error: mensaje });
const clonar = (valor) => JSON.parse(JSON.stringify(valor));

function leerNumeroDeQuery(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') return NaN;
  return Number(valor);
}

function leerNumeroDeCuerpo(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

const leerTexto = (valor) => (typeof valor === 'string' ? valor.trim() : '');
const coordenadasValidas = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180;

// Misma regla que `filtrarVigentesPorUsuarioYBano` (AD-3).
function filtrarVigentes(filas) {
  const vigentes = new Map();
  for (const fila of filas) {
    const clave = `${fila.usuario_id}|${fila['baño_id']}`;
    const actual = vigentes.get(clave);
    if (
      !actual ||
      fila.created_at > actual.created_at ||
      (fila.created_at === actual.created_at && fila.secuencia > actual.secuencia)
    ) {
      vigentes.set(clave, fila);
    }
  }
  return [...vigentes.values()];
}

/**
 * Crea una API demo con su propio estado en memoria (una por recarga de la
 * página). `ahora` es inyectable para probar la ventana de 15 min.
 */
export function crearApiDemo({ ahora = () => Date.now(), usuarioId = USUARIO_DEMO_ID } = {}) {
  const db = {
    perfiles: crearPerfilesDemo(),
    banos: crearBanosDemo(),
    checkins: crearCheckinsDemo(),
    calificaciones: crearCalificacionesDemo(),
    sugerencias: [],
  };
  let buzonActivo = true;
  // Arranca en 1000 para no chocar con los ids semilla de datosDemo.js.
  let contador = 1000;
  let secuencia = db.calificaciones.length;
  const fallasPendientes = new Set();

  const nuevoId = (prefijo) => `${prefijo}-0000-4000-8000-${String(++contador).padStart(12, '0')}`;
  const fechaActual = () => new Date(ahora()).toISOString();
  const perfilPorId = (id) => db.perfiles.find((perfil) => perfil.id === id) || null;

  function promedioDe(banoId) {
    const vigentes = filtrarVigentes(db.calificaciones.filter((fila) => fila['baño_id'] === banoId));
    if (vigentes.length === 0) return null;
    return vigentes.reduce((suma, fila) => suma + fila.estrellas, 0) / vigentes.length;
  }

  // Espejo de `verificarAutorizado`: sin perfil o `autorizado === false` → 403.
  function bloqueoAutorizacion() {
    const perfil = perfilPorId(usuarioId);
    if (!perfil || perfil.autorizado === false) {
      return error(403, 'CagApp anda en modo VIP 🕶️ — tu acceso todavía no está listo.');
    }
    return null;
  }

  function getBanos(query) {
    const zona = leerTexto(query.get('zona') ?? '');
    const hayCoordenadas = query.has('lat') || query.has('lng');
    let lat;
    let lng;
    if (hayCoordenadas) {
      lat = leerNumeroDeQuery(query.get('lat') ?? undefined);
      lng = leerNumeroDeQuery(query.get('lng') ?? undefined);
      if (!coordenadasValidas(lat, lng)) return error(400, MENSAJES.coordenadasQuery);
    } else if (!zona) {
      return error(400, MENSAJES.sinUbicacionNiZona);
    }

    const filas = zona
      ? db.banos.filter((bano) => bano.zona.toLowerCase().includes(zona.toLowerCase()))
      : db.banos;
    const banos = filas.map((bano) => ({
      ...clonar(bano),
      calificacion_promedio: promedioDe(bano.id),
      distancia_metros: hayCoordenadas ? calcularDistanciaMetros({ lat, lng }, bano) : null,
    }));
    if (hayCoordenadas) banos.sort((x, y) => x.distancia_metros - y.distancia_metros);
    return respuesta(200, banos);
  }

  function postBano(cuerpo) {
    const nombre = leerTexto(cuerpo?.nombre);
    const zona = leerTexto(cuerpo?.zona);
    const tipoLugar = leerTexto(cuerpo?.tipo_lugar);
    const lat = leerNumeroDeCuerpo(cuerpo?.lat);
    const lng = leerNumeroDeCuerpo(cuerpo?.lng);

    if (!nombre) return error(400, MENSAJES.sinNombre);
    if (nombre.length > 100) return error(400, MENSAJES.nombreLargo);
    if (!zona) return error(400, MENSAJES.sinZona);
    if (zona.length > 100) return error(400, MENSAJES.zonaLarga);
    if (!tipoLugar) return error(400, MENSAJES.sinTipo);
    if (tipoLugar.length > 100) return error(400, MENSAJES.tipoLargo);
    if (!coordenadasValidas(lat, lng)) return error(400, MENSAJES.coordenadasCuerpo);

    const bano = {
      id: nuevoId('ba000000'),
      nombre,
      lat,
      lng,
      tipo_lugar: tipoLugar,
      zona,
      creado_por: usuarioId,
      created_at: fechaActual(),
    };
    db.banos.push(bano);
    return respuesta(201, clonar(bano));
  }

  function validarBanoId(valor) {
    const banoId = typeof valor === 'string' ? valor.trim() : '';
    if (!banoId) return { falla: error(400, MENSAJES.sinBanoId) };
    if (!PATRON_UUID.test(banoId)) return { falla: error(400, MENSAJES.banoIdInvalido) };
    return { banoId };
  }

  function postCheckin(cuerpo) {
    const { banoId, falla } = validarBanoId(cuerpo?.bano_id);
    if (falla) return falla;
    const lat = leerNumeroDeCuerpo(cuerpo?.lat);
    const lng = leerNumeroDeCuerpo(cuerpo?.lng);
    const accuracy = leerNumeroDeCuerpo(cuerpo?.accuracy);
    if (!coordenadasValidas(lat, lng)) return error(400, MENSAJES.coordenadasCuerpo);
    if (!Number.isFinite(accuracy) || accuracy < 0) return error(400, MENSAJES.accuracyInvalida);

    const bano = db.banos.find((fila) => fila.id === banoId);
    if (!bano) return error(400, MENSAJES.banoNoEncontrado);

    const resultado = evaluarDistanciaCheckin({ lat, lng, accuracy }, bano);
    if (resultado === 'fuera_de_rango') return error(403, MENSAJES.fueraDeRango);
    if (resultado === 'precision_insuficiente') return error(422, MENSAJES.precisionInsuficiente);

    // AD-13: lat/lng/accuracy nunca se guardan.
    const checkin = { id: nuevoId('c0000000'), usuario_id: usuarioId, 'baño_id': banoId, created_at: fechaActual() };
    db.checkins.push(checkin);
    return respuesta(201, clonar(checkin));
  }

  function tieneCheckinVigente(banoId) {
    const ultimo = db.checkins
      .filter((fila) => fila.usuario_id === usuarioId && fila['baño_id'] === banoId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))[0];
    return Boolean(ultimo) && ahora() - new Date(ultimo.created_at).getTime() <= VENTANA_CHECKIN_MS;
  }

  function postCalificacion(cuerpo) {
    const { banoId, falla } = validarBanoId(cuerpo?.bano_id);
    if (falla) return falla;
    const estrellas = leerNumeroDeCuerpo(cuerpo?.estrellas);
    if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
      return error(400, MENSAJES.estrellasInvalidas);
    }
    if (!tieneCheckinVigente(banoId)) return error(403, MENSAJES.sinCheckinVigente);

    const calificacion = {
      id: nuevoId('ca000000'),
      usuario_id: usuarioId,
      'baño_id': banoId,
      estrellas,
      created_at: fechaActual(),
      secuencia: ++secuencia,
    };
    db.calificaciones.push(calificacion);
    return respuesta(201, { ...clonar(calificacion), calificacion_promedio: promedioDe(banoId) });
  }

  function getCalificaciones(query) {
    const { banoId, falla } = validarBanoId(query.get('bano_id') ?? '');
    if (falla) return falla;
    const vigentes = filtrarVigentes(db.calificaciones.filter((fila) => fila['baño_id'] === banoId));
    const publicas = vigentes
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .map((fila) => ({
        nombre_para_mostrar: perfilPorId(fila.usuario_id)?.nombre_para_mostrar ?? null,
        estrellas: fila.estrellas,
        created_at: fila.created_at,
      }));
    return respuesta(200, publicas);
  }

  function postPerfil(cuerpo) {
    const nombre = cuerpo?.nombre_para_mostrar;
    if (!nombre || typeof nombre !== 'string' || !nombre.trim()) return error(400, MENSAJES.sinNombrePerfil);
    if (nombre.trim().length > 100) return error(400, MENSAJES.nombreLargo);
    let perfil = perfilPorId(usuarioId);
    if (perfil) {
      perfil.nombre_para_mostrar = nombre.trim();
    } else {
      perfil = { id: usuarioId, nombre_para_mostrar: nombre.trim(), autorizado: true, created_at: fechaActual() };
      db.perfiles.push(perfil);
    }
    return respuesta(200, clonar(perfil));
  }

  function getPerfilYo() {
    const perfil = perfilPorId(usuarioId);
    return perfil ? respuesta(200, clonar(perfil)) : error(404, MENSAJES.sinPerfil);
  }

  function getActividad() {
    const banoIds = [];
    [...db.checkins]
      .filter((fila) => fila.usuario_id === usuarioId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      .forEach((fila) => {
        if (!banoIds.includes(fila['baño_id'])) banoIds.push(fila['baño_id']);
      });
    const vigentes = filtrarVigentes(db.calificaciones.filter((fila) => fila.usuario_id === usuarioId));
    const estrellasPorBano = new Map(vigentes.map((fila) => [fila['baño_id'], fila.estrellas]));
    return respuesta(
      200,
      banoIds.map((banoId) => {
        const bano = db.banos.find((fila) => fila.id === banoId) || {};
        return {
          'baño_id': banoId,
          nombre: bano.nombre ?? null,
          tipo_lugar: bano.tipo_lugar ?? null,
          zona: bano.zona ?? null,
          estrellas: estrellasPorBano.has(banoId) ? estrellasPorBano.get(banoId) : null,
        };
      })
    );
  }

  function postSugerencia(cuerpo) {
    if (!buzonActivo) return error(404, MENSAJES.buzonCerrado);
    const tipo = cuerpo?.tipo;
    if (!['bug', 'sugerencia'].includes(tipo)) return error(400, MENSAJES.tipoSugerenciaInvalido);
    const texto = typeof cuerpo?.texto === 'string' ? cuerpo.texto.trim() : '';
    if (!texto) return error(400, MENSAJES.textoVacio);
    if (texto.length > MAX_CARACTERES_SUGERENCIA) return error(400, MENSAJES.textoLargo);
    const sugerencia = { id: nuevoId('50000000'), usuario_id: usuarioId, tipo, texto, created_at: fechaActual() };
    db.sugerencias.push(sugerencia);
    return respuesta(201, clonar(sugerencia));
  }

  // [handler, requiere gate de autorización] — mismo montaje que backend/src/rutas.
  const rutas = {
    'GET /banos': [(q) => getBanos(q), true],
    'POST /banos': [(_q, c) => postBano(c), true],
    'POST /checkins': [(_q, c) => postCheckin(c), true],
    'GET /calificaciones': [(q) => getCalificaciones(q), true],
    'POST /calificaciones': [(_q, c) => postCalificacion(c), true],
    'POST /perfiles': [(_q, c) => postPerfil(c), false],
    'GET /perfiles/yo': [() => getPerfilYo(), false],
    'GET /perfiles/yo/actividad': [() => getActividad(), true],
    'GET /sugerencias/estado': [() => respuesta(200, { activas: buzonActivo }), true],
    'POST /sugerencias': [(_q, c) => postSugerencia(c), true],
  };

  const normalizarRuta = (ruta) => {
    const sinQuery = String(ruta).split('?')[0];
    const conBarra = sinQuery.startsWith('/') ? sinQuery : `/${sinQuery}`;
    return conBarra.length > 1 ? conBarra.replace(/\/+$/, '') : conBarra;
  };

  function manejarPeticion(metodo, ruta, cuerpo) {
    const url = new URL(String(ruta), 'http://demo.local');
    const camino = normalizarRuta(url.pathname);
    const clave = `${String(metodo || 'GET').toUpperCase()} ${camino}`;
    const entrada = rutas[clave];

    if (fallasPendientes.has(camino)) {
      fallasPendientes.delete(camino);
      return error(500, MENSAJE_500[clave] || 'Falla forzada del modo demo 😬 — intenta de nuevo.');
    }

    if (!entrada) return error(404, MENSAJES.rutaDesconocida);

    const [manejador, requiereAutorizacion] = entrada;
    if (requiereAutorizacion) {
      const bloqueo = bloqueoAutorizacion();
      if (bloqueo) return bloqueo;
    }
    return manejador(url.searchParams, cuerpo);
  }

  return {
    manejarPeticion,
    /** La siguiente petición (cualquier método) a `ruta` responde 500. */
    fallarSiguiente(ruta) {
      fallasPendientes.add(normalizarRuta(ruta));
    },
    /** Prende o apaga el switch de sugerencias (`configuracion.sugerencias_activas`). */
    buzon(activo) {
      if (typeof activo !== 'boolean') {
        throw new TypeError('buzon(activo) necesita true o false');
      }
      buzonActivo = activo;
      return buzonActivo;
    },
    /** Copia del estado en memoria (perfiles incluidos), para inspeccionarlo desde la consola. */
    estado() {
      return clonar({
        perfiles: db.perfiles,
        banos: db.banos,
        checkins: db.checkins,
        calificaciones: db.calificaciones,
        sugerencias: db.sugerencias,
        buzonActivo,
      });
    },
  };
}
