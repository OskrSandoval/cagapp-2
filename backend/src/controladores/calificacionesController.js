import { calificarBano, obtenerCalificacionesPublicas } from '../servicios/calificacionesService.js';
import { esUuidValido } from '../validacion.js';

function leerEnteroDeCuerpo(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

// Copy chusca (Design Notes de la spec 3.1, reutilizado en 3.2): 403/400 son
// una elección interna de la API (invisible para el usuario) — lo único que
// le llega es este texto.
const MENSAJE_SIN_CHECKIN_VIGENTE =
  'Necesitas hacer check-in aquí antes de calificar 🕵️ — o tu check-in ya expiró, vuelve a intentarlo.';

/**
 * `postCalificacion` valida el body y mapea el resultado de `calificarBano`
 * a un código HTTP: 201 (válido, con `calificacion_promedio` actualizado) o
 * 403 (sin check-in vigente — el backend es la única autoridad, ninguna vía
 * puede saltárselo) / 400 (campos inválidos). `usuarioId` sale de
 * `req.usuarioId` (JWT verificado por `verificarSesion`), nunca del body.
 */
export async function postCalificacion(req, res) {
  const banoId = typeof req.body?.bano_id === 'string' ? req.body.bano_id.trim() : '';
  const estrellas = leerEnteroDeCuerpo(req.body?.estrellas);

  if (!banoId) {
    return res.status(400).json({ error: 'Necesitamos saber de qué baño hablamos 🚽.' });
  }

  if (!esUuidValido(banoId)) {
    return res.status(400).json({ error: 'Ese id de baño no cuadra 🧐 — intenta de nuevo.' });
  }

  if (!Number.isInteger(estrellas) || estrellas < 1 || estrellas > 5) {
    return res.status(400).json({ error: 'Elige entre 1 y 5 estrellas ⭐ — nada de medias tintas.' });
  }

  try {
    const resultado = await calificarBano({ usuarioId: req.usuarioId, banoId, estrellas });

    if (resultado.resultado === 'sin_checkin_vigente') {
      return res.status(403).json({ error: MENSAJE_SIN_CHECKIN_VIGENTE });
    }

    return res.status(201).json({
      ...resultado.calificacion,
      calificacion_promedio: resultado.calificacionPromedio,
    });
  } catch {
    return res.status(500).json({ error: 'No pudimos guardar tu calificación 😬 — intenta de nuevo.' });
  }
}

/**
 * Story 4.2: `getCalificacionesPublicas` valida `bano_id` (query, uuid vía
 * `esUuidValido`, mismo criterio que `postCalificacion`/`checkinsController`)
 * y responde 200 con la lista pública restringida (AD-11), vacía si el baño
 * todavía no tiene ninguna. Nunca 500 genérico por un uuid con formato
 * inválido.
 */
export async function getCalificacionesPublicas(req, res) {
  const banoId = typeof req.query?.bano_id === 'string' ? req.query.bano_id.trim() : '';

  if (!banoId) {
    return res.status(400).json({ error: 'Necesitamos saber de qué baño hablamos 🚽.' });
  }

  if (!esUuidValido(banoId)) {
    return res.status(400).json({ error: 'Ese id de baño no cuadra 🧐 — intenta de nuevo.' });
  }

  try {
    const calificaciones = await obtenerCalificacionesPublicas(banoId);
    return res.status(200).json(calificaciones);
  } catch {
    return res
      .status(500)
      .json({ error: 'No pudimos revisar las calificaciones de este baño 😬 — intenta de nuevo.' });
  }
}
