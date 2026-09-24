import { supabaseAdmin as clientePorDefecto } from '../datos/supabaseAdmin.js';
import { filtrarVigentesPorUsuarioYBano } from './calificacionesService.js';

// AD-10: la fila de `perfiles` se crea/actualiza con una llamada explícita
// del backend (nunca un trigger de base de datos). El `cliente` es
// inyectable para poder probar esta capa sin pegarle a Supabase real.

/**
 * Upsert idempotente por `id`: reintentar con el mismo id nunca duplica ni
 * falla por llave repetida, solo actualiza `nombre_para_mostrar`.
 */
export async function crearOActualizarPerfil({ id, nombreParaMostrar }, cliente = clientePorDefecto) {
  const { data, error } = await cliente
    .from('perfiles')
    .upsert({ id, nombre_para_mostrar: nombreParaMostrar }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Devuelve la fila de `perfiles` o null si el usuario todavía no tiene una
 * (el controlador traduce ese null a un 404).
 */
export async function obtenerPerfilPorId(id, cliente = clientePorDefecto) {
  const { data, error } = await cliente.from('perfiles').select('*').eq('id', id).maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Story 4.1: actividad propia del usuario para su Perfil. `usuarioId`
 * siempre sale de `req.usuarioId` (JWT verificado) en el controlador — este
 * servicio nunca acepta un id ajeno, así que nunca puede filtrar por otro
 * usuario. Lee `checkins` del usuario, se queda con un baño por cada baño
 * distinto (el check-in más reciente, ya que la consulta viene ordenada
 * desc), y cruza cada uno con su calificación vigente reusando
 * `filtrarVigentesPorUsuarioYBano` (nunca reimplementa esa lógica). Devuelve
 * `[]` si el usuario no tiene ningún check-in — el controlador y el
 * frontend traducen eso al estado vacío invitando a calificar.
 */
export async function obtenerActividad(usuarioId, cliente = clientePorDefecto) {
  const { data: checkins, error: errorCheckins } = await cliente
    .from('checkins')
    .select('"baño_id", created_at')
    .eq('usuario_id', usuarioId)
    .order('created_at', { ascending: false });

  if (errorCheckins) {
    throw new Error(errorCheckins.message);
  }

  const banoIdsVistos = new Set();
  const banoIdsOrdenados = [];
  for (const fila of checkins || []) {
    const banoId = fila['baño_id'];
    if (!banoIdsVistos.has(banoId)) {
      banoIdsVistos.add(banoId);
      banoIdsOrdenados.push(banoId);
    }
  }

  if (banoIdsOrdenados.length === 0) {
    return [];
  }

  const { data: banos, error: errorBanos } = await cliente
    .from('baños')
    .select('id, nombre, tipo_lugar, zona')
    .in('id', banoIdsOrdenados);

  if (errorBanos) {
    throw new Error(errorBanos.message);
  }

  const banosPorId = new Map((banos || []).map((bano) => [bano.id, bano]));

  const { data: calificaciones, error: errorCalificaciones } = await cliente
    .from('calificaciones')
    .select('usuario_id, "baño_id", estrellas, created_at, secuencia')
    .eq('usuario_id', usuarioId)
    .in('baño_id', banoIdsOrdenados);

  if (errorCalificaciones) {
    throw new Error(errorCalificaciones.message);
  }

  const vigentes = filtrarVigentesPorUsuarioYBano(calificaciones || []);
  const estrellasPorBano = new Map(vigentes.map((fila) => [fila['baño_id'], fila.estrellas]));

  return banoIdsOrdenados.map((banoId) => {
    const bano = banosPorId.get(banoId) || {};
    return {
      'baño_id': banoId,
      nombre: bano.nombre ?? null,
      tipo_lugar: bano.tipo_lugar ?? null,
      zona: bano.zona ?? null,
      estrellas: estrellasPorBano.has(banoId) ? estrellasPorBano.get(banoId) : null,
    };
  });
}
