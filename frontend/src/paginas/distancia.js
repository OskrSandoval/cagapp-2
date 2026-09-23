/**
 * Formatea `distancia_metros` en m (<1km) o km (>=1km, un decimal).
 * `null`-safe (modo zona, sin ubicación, no trae distancia).
 * Compartido entre Lista (2.2) y Detalle (2.3) para no duplicar el
 * formateo en cada pantalla (esto es presentación, no el cálculo de
 * distancia en sí — ese es el Haversine único de AD-4, en el backend).
 */
export function formatearDistancia(metros) {
  if (typeof metros !== 'number') return null;
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}
