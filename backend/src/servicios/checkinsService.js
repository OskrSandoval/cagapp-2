import { supabaseAdmin as clientePorDefecto } from '../datos/supabaseAdmin.js';
import { calcularDistanciaMetros } from './banosService.js';

const RADIO_CHECKIN_METROS = 150;
// AD-8: por encima de esta precisión (metros) el GPS no permite confirmar
// ni descartar el radio de 150m con certeza.
const ACCURACY_MAXIMA_CONFIABLE = 100;

/**
 * AD-8: pura, sin I/O — reutiliza el único Haversine del backend (AD-4).
 * Resta `accuracy` a la distancia real para obtener la distancia mínima
 * posible y decide entre los tres resultados de la Épica 3. Nunca hay un
 * cuarto "rechazo silencioso": todo intento cae en uno de estos tres.
 *
 * Orden de las reglas (AD-8, en ese orden):
 * 1. Si incluso en el mejor caso (distancia real menos el margen de error)
 *    ya se excede el radio, es "fuera de rango" sin importar qué tan mala
 *    sea la precisión — no hay ambigüedad que resolver reintentando.
 * 2. Si no es un "fuera de rango" seguro pero la precisión es demasiado
 *    mala para confirmar el radio con certeza, es "precisión insuficiente"
 *    (nunca un rechazo, se ofrece reintentar).
 * 3. Si no, es "válido".
 */
export function evaluarDistanciaCheckin({ lat, lng, accuracy }, bano) {
  const distanciaReal = calcularDistanciaMetros({ lat, lng }, { lat: bano.lat, lng: bano.lng });
  const distanciaMinima = distanciaReal - accuracy;

  if (distanciaMinima > RADIO_CHECKIN_METROS) {
    return { resultado: 'fuera_de_rango', distanciaReal, distanciaMinima };
  }

  if (accuracy > ACCURACY_MAXIMA_CONFIABLE) {
    return { resultado: 'precision_insuficiente', distanciaReal, distanciaMinima };
  }

  return { resultado: 'valido', distanciaReal, distanciaMinima };
}

/**
 * Busca el baño por id, evalúa la distancia del intento (AD-8) y, solo si
 * es válido, inserta la fila de `checkins`. `usuarioId` sale de
 * `req.usuarioId` (JWT verificado) en el controlador, nunca del body —
 * mismo tratamiento que `creadoPor` en `crearBano`. AD-13: `lat`/`lng`/
 * `accuracy` solo se usan aquí en memoria para calcular distancia; nunca se
 * escriben en `checkins` ni en ninguna otra tabla.
 */
export async function crearCheckin({ usuarioId, banoId, lat, lng, accuracy }, cliente = clientePorDefecto) {
  const { data: bano, error: errorBano } = await cliente
    .from('baños')
    .select('id, lat, lng')
    .eq('id', banoId)
    .maybeSingle();

  if (errorBano) {
    throw new Error(errorBano.message);
  }

  if (!bano) {
    return { resultado: 'bano_no_encontrado' };
  }

  const evaluacion = evaluarDistanciaCheckin({ lat, lng, accuracy }, bano);

  if (evaluacion.resultado !== 'valido') {
    return { resultado: evaluacion.resultado };
  }

  const { data: checkin, error: errorInsert } = await cliente
    .from('checkins')
    .insert({ usuario_id: usuarioId, 'baño_id': banoId })
    .select()
    .single();

  if (errorInsert) {
    throw new Error(errorInsert.message);
  }

  return { resultado: 'valido', checkin };
}
