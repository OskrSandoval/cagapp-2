import { supabaseAdmin as clientePorDefecto } from '../datos/supabaseAdmin.js';

const RADIO_TIERRA_METROS = 6371000;
const aRadianes = (grados) => (grados * Math.PI) / 180;

/**
 * AD-4: única implementación de Haversine del backend. La reutilizan la
 * búsqueda de duplicados (1.5km, Story 2.4) y el check-in (150m, Épica 3).
 * `a` y `b` son `{ lat, lng }` en grados; devuelve metros.
 */
export function calcularDistanciaMetros(a, b) {
  const dLat = aRadianes(b.lat - a.lat);
  const dLng = aRadianes(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(aRadianes(a.lat)) * Math.cos(aRadianes(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * RADIO_TIERRA_METROS * Math.asin(Math.min(1, Math.sqrt(h)));
}

// Escapa los comodines de ILIKE para que la zona se busque como texto literal.
function escaparComodines(texto) {
  return texto.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Devuelve todos los baños (sin paginación, diferido por el epic). Con `zona`
 * filtra por ILIKE; con `lat`/`lng` agrega `distancia_metros` y ordena por
 * cercanía. `calificacion_promedio` es null hasta que exista la Épica 3.
 */
export async function listarBanos({ lat, lng, zona } = {}, cliente = clientePorDefecto) {
  let consulta = cliente.from('baños').select('*');

  if (zona) {
    consulta = consulta.ilike('zona', `%${escaparComodines(zona)}%`);
  }

  const { data, error } = await consulta;

  if (error) {
    throw new Error(error.message);
  }

  const conUbicacion = typeof lat === 'number' && typeof lng === 'number';

  const banos = (data || []).map((bano) => ({
    ...bano,
    calificacion_promedio: null,
    distancia_metros: conUbicacion ? calcularDistanciaMetros({ lat, lng }, { lat: bano.lat, lng: bano.lng }) : null,
  }));

  if (conUbicacion) {
    banos.sort((x, y) => x.distancia_metros - y.distancia_metros);
  }

  return banos;
}

/**
 * Inserta un baño nuevo (Story 2.4). `creadoPor` siempre sale de
 * `req.usuarioId` (JWT verificado) en el controlador, nunca del body — esta
 * capa solo hace el `insert`, mismo patrón que `crearOActualizarPerfil`.
 */
export async function crearBano({ nombre, lat, lng, tipoLugar, zona, creadoPor }, cliente = clientePorDefecto) {
  const { data, error } = await cliente
    .from('baños')
    .insert({ nombre, lat, lng, tipo_lugar: tipoLugar, zona, creado_por: creadoPor })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}
