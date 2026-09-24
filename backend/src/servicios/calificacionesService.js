import { supabaseAdmin as clientePorDefecto } from '../datos/supabaseAdmin.js';

// Design Notes de la spec 3.2: ninguna fuente de planeación fija un número —
// se elige porque el flujo diseñado es check-in→calificar en una sola
// interacción continua.
const VENTANA_CHECKIN_MS = 15 * 60 * 1000;

/**
 * Único mecanismo de "hay un check-in vigente" (gap de modelo de datos que
 * epic-3-context.md dejó pendiente): busca la fila más reciente de
 * `checkins` para ese `(usuarioId, banoId)` y la considera vigente solo si
 * cayó dentro de los últimos 15 minutos. Nunca reimplementa la lógica de
 * distancia de `checkinsService.js` — solo lee lo que esa tabla ya dejó.
 * Devuelve la fila si está vigente, o `null` si no hay check-in o si ya
 * expiró (ambos casos se tratan igual: sin check-in vigente).
 */
export async function obtenerCheckinVigente({ usuarioId, banoId }, cliente = clientePorDefecto) {
  const { data, error } = await cliente
    .from('checkins')
    .select('id, created_at')
    .eq('usuario_id', usuarioId)
    .eq('baño_id', banoId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const antiguedadMs = Date.now() - new Date(data.created_at).getTime();
  return antiguedadMs <= VENTANA_CHECKIN_MS ? data : null;
}

/**
 * AD-3: de un conjunto de filas de `calificaciones` (posiblemente con varias
 * filas históricas por usuario), se queda solo con la más reciente por
 * `(usuario_id, baño_id)` — desempatada por `secuencia` cuando el
 * `created_at` es idéntico. Pura, sin I/O, para poder probarla directo.
 */
export function filtrarVigentesPorUsuarioYBano(filas) {
  const vigentes = new Map();

  for (const fila of filas) {
    const clave = `${fila.usuario_id}|${fila['baño_id']}`;
    const actual = vigentes.get(clave);

    if (!actual) {
      vigentes.set(clave, fila);
      continue;
    }

    const esMasReciente =
      fila.created_at > actual.created_at ||
      (fila.created_at === actual.created_at && fila.secuencia > actual.secuencia);

    if (esMasReciente) {
      vigentes.set(clave, fila);
    }
  }

  return [...vigentes.values()];
}

/**
 * Promedio por baño (nunca cacheado, Design Notes de la spec 3.2): toma solo
 * la fila vigente de cada `(usuario_id, baño_id)` dentro de los
 * `banoIds` pedidos y promedia `estrellas` por baño. Devuelve un objeto
 * `{ [banoId]: promedio }` — los baños sin ninguna calificación vigente
 * simplemente no aparecen como llave.
 */
export async function obtenerPromediosPorBano(banoIds, cliente = clientePorDefecto) {
  const idsUnicos = [...new Set(banoIds || [])];

  if (idsUnicos.length === 0) {
    return {};
  }

  const { data, error } = await cliente
    .from('calificaciones')
    .select('usuario_id, "baño_id", estrellas, created_at, secuencia')
    .in('baño_id', idsUnicos);

  if (error) {
    throw new Error(error.message);
  }

  const vigentes = filtrarVigentesPorUsuarioYBano(data || []);

  const acumuladoPorBano = new Map();
  for (const fila of vigentes) {
    const banoId = fila['baño_id'];
    const acumulado = acumuladoPorBano.get(banoId) || { suma: 0, conteo: 0 };
    acumulado.suma += fila.estrellas;
    acumulado.conteo += 1;
    acumuladoPorBano.set(banoId, acumulado);
  }

  const promedios = {};
  for (const [banoId, { suma, conteo }] of acumuladoPorBano) {
    promedios[banoId] = suma / conteo;
  }

  return promedios;
}

/**
 * Story 4.2: forma pública restringida de las calificaciones de un baño
 * (AD-11) — la respuesta nunca incluye `usuario_id` ni ninguna otra forma de
 * ubicar al usuario. Trae todas las filas de `calificaciones` de `banoId`,
 * se queda con la vigente de cada usuario reusando
 * `filtrarVigentesPorUsuarioYBano` (nunca reimplementa esa lógica), cruza
 * cada una con `perfiles.nombre_para_mostrar` y devuelve
 * `[{ nombre_para_mostrar, estrellas, created_at }]` ordenadas por
 * `created_at` descendente (más recientes primero, epic-4-context.md: sin
 * paginación todavía). Devuelve `[]` si el baño no tiene ninguna
 * calificación vigente, sin llegar a consultar `perfiles`.
 */
export async function obtenerCalificacionesPublicas(banoId, cliente = clientePorDefecto) {
  const { data, error } = await cliente
    .from('calificaciones')
    .select('usuario_id, "baño_id", estrellas, created_at, secuencia')
    .eq('baño_id', banoId);

  if (error) {
    throw new Error(error.message);
  }

  const vigentes = filtrarVigentesPorUsuarioYBano(data || []);

  if (vigentes.length === 0) {
    return [];
  }

  const usuarioIds = [...new Set(vigentes.map((fila) => fila.usuario_id))];

  const { data: perfiles, error: errorPerfiles } = await cliente
    .from('perfiles')
    .select('id, nombre_para_mostrar')
    .in('id', usuarioIds);

  if (errorPerfiles) {
    throw new Error(errorPerfiles.message);
  }

  const nombrePorUsuario = new Map((perfiles || []).map((perfil) => [perfil.id, perfil.nombre_para_mostrar]));

  return [...vigentes]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .map((fila) => ({
      nombre_para_mostrar: nombrePorUsuario.get(fila.usuario_id) ?? null,
      estrellas: fila.estrellas,
      created_at: fila.created_at,
    }));
}

/**
 * Verifica el check-in vigente (backend como única autoridad, ninguna vía
 * puede saltárselo) y, solo si existe, inserta la calificación (AD-3:
 * append-only, jamás UPDATE/DELETE) y recalcula el promedio del baño a
 * partir de las filas vigentes (nunca cacheado). `usuarioId` sale de
 * `req.usuarioId` (JWT verificado) en el controlador, nunca del body.
 */
export async function calificarBano({ usuarioId, banoId, estrellas }, cliente = clientePorDefecto) {
  const checkinVigente = await obtenerCheckinVigente({ usuarioId, banoId }, cliente);

  if (!checkinVigente) {
    return { resultado: 'sin_checkin_vigente' };
  }

  const { data: calificacion, error: errorInsert } = await cliente
    .from('calificaciones')
    .insert({ usuario_id: usuarioId, 'baño_id': banoId, estrellas })
    .select()
    .single();

  if (errorInsert) {
    throw new Error(errorInsert.message);
  }

  const promedios = await obtenerPromediosPorBano([banoId], cliente);

  return {
    resultado: 'valido',
    calificacion,
    calificacionPromedio: promedios[banoId] ?? null,
  };
}
