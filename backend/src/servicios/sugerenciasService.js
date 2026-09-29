import { supabaseAdmin as clientePorDefecto } from '../datos/supabaseAdmin.js';

/**
 * Inserta una sugerencia. `usuarioId` sale de `req.usuarioId`
 * (JWT verificado) en el controlador, nunca del body. Solo se guardan
 * `usuario_id`, `tipo` y `texto`; `id` y `created_at` los pone la base.
 */
export async function crearSugerencia({ usuarioId, tipo, texto }, cliente = clientePorDefecto) {
  const { data, error } = await cliente
    .from('sugerencias')
    .insert({ usuario_id: usuarioId, tipo, texto })
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

/**
 * Switch de la fase "friends and family": lee la fila única (id = 1) de
 * `configuracion`. Sin fila cuenta como apagado — nunca se prende por
 * omisión.
 */
export async function sugerenciasActivas(cliente = clientePorDefecto) {
  const { data, error } = await cliente
    .from('configuracion')
    .select('sugerencias_activas')
    .eq('id', 1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data?.sugerencias_activas === true;
}
