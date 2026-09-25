// EXPERIENCE.md § Voice and Tone — las 5 captions canónicas del picker de
// calificación, reutilizadas en Detalle como etiqueta cualitativa del
// promedio (`Etiqueta de calificación`, EXPERIENCE.md § Component Patterns).
export const CAPTIONS_CALIFICACION = {
  1: '💩 Un desastre',
  2: '😬 Sobrevivible, de panza',
  3: '😐 Normalito, ni fu ni fa',
  4: '🙂 Bien limpio, sin drama',
  5: '🤩 Limpio, amplio y hasta huele bien',
};

/**
 * Banda más cercana (1-5) para un promedio, regla `[GAP]` de EXPERIENCE.md
 * resuelta como default: `Math.round`, acotado al rango 1-5.
 */
export function bandaCalificacion(promedio) {
  return Math.min(5, Math.max(1, Math.round(promedio)));
}

/**
 * Renderiza N de 5 como estrellas llenas/vacías. Compartida entre `Detalle`
 * y `Perfil` (retro de la Épica 4: estaba duplicada línea por línea entre
 * ambos archivos).
 */
export function estrellasEstaticas(n) {
  return '★'.repeat(n) + '☆'.repeat(5 - n);
}
