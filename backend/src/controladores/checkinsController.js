import { crearCheckin } from '../servicios/checkinsService.js';

function leerNumeroDeCuerpo(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

// `baño_id`/`id` son uuid en la base — un valor con formato inválido nunca
// llega a existir, pero dejar que la validación de sintaxis de Postgres lo
// rechace convertiría esto en un 500 genérico en vez de un 400 claro.
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Copy chusca (Design Notes de la spec 3.1): no hay mockup para estos
// mensajes, se autoran en el mismo tono ya establecido en el resto de la
// app. 403/422/400 son una elección interna de la API (invisible para el
// usuario) — lo único que le llega es este texto.
const MENSAJE_FUERA_DE_RANGO =
  'Estás fuera de rango 📏 — tienes que estar a menos de 150m del baño para hacer check-in.';
const MENSAJE_PRECISION_INSUFICIENTE =
  'Tu GPS anda medio perdido 📡 — no podemos confirmar que estés a menos de 150m. Intenta de nuevo.';
const MENSAJE_BANO_NO_ENCONTRADO = 'Ese baño ya no existe o no lo encontramos 🚽❓.';

/**
 * `postCheckin` valida el body y mapea el resultado de `crearCheckin` a un
 * código HTTP: 201 (válido), 403 (fuera de rango), 422 (precisión
 * insuficiente) o 400 (baño inexistente o campos inválidos). `usuarioId`
 * sale de `req.usuarioId` (JWT verificado por `verificarSesion`), nunca del
 * body.
 */
export async function postCheckin(req, res) {
  const banoId = typeof req.body?.bano_id === 'string' ? req.body.bano_id.trim() : '';
  const lat = leerNumeroDeCuerpo(req.body?.lat);
  const lng = leerNumeroDeCuerpo(req.body?.lng);
  const accuracy = leerNumeroDeCuerpo(req.body?.accuracy);

  if (!banoId) {
    return res.status(400).json({ error: 'Necesitamos saber de qué baño hablamos 🚽.' });
  }

  if (!PATRON_UUID.test(banoId)) {
    return res.status(400).json({ error: 'Ese id de baño no cuadra 🧐 — intenta de nuevo.' });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Esas coordenadas no cuadran 🧭 — necesitamos tu ubicación válida.' });
  }

  if (!Number.isFinite(accuracy) || accuracy < 0) {
    return res.status(400).json({ error: 'Esa precisión de GPS no cuadra 📡 — intenta de nuevo.' });
  }

  try {
    const resultado = await crearCheckin({ usuarioId: req.usuarioId, banoId, lat, lng, accuracy });

    if (resultado.resultado === 'bano_no_encontrado') {
      return res.status(400).json({ error: MENSAJE_BANO_NO_ENCONTRADO });
    }

    if (resultado.resultado === 'fuera_de_rango') {
      return res.status(403).json({ error: MENSAJE_FUERA_DE_RANGO });
    }

    if (resultado.resultado === 'precision_insuficiente') {
      return res.status(422).json({ error: MENSAJE_PRECISION_INSUFICIENTE });
    }

    return res.status(201).json(resultado.checkin);
  } catch {
    return res.status(500).json({ error: 'No pudimos registrar tu check-in 😬 — intenta de nuevo.' });
  }
}
