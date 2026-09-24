// `baño_id`/`id` son uuid en la base — un valor con formato inválido nunca
// llega a existir, pero dejar que la validación de sintaxis de Postgres lo
// rechace convertiría eso en un 500 genérico en vez de un 400 claro. Único
// patrón compartido por `checkinsController.js` y `calificacionesController.js`
// para que no se desalineen entre sí.
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function esUuidValido(valor) {
  return typeof valor === 'string' && PATRON_UUID.test(valor);
}
