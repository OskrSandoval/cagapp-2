import { supabaseAdmin as clientePorDefecto } from '../datos/supabaseAdmin.js';

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
