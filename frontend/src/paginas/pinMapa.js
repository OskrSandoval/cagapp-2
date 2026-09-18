/** Nivel de color del pin: nunca es la única señal, el número siempre va aparte. */
export function nivelCalificacion(promedio) {
  if (typeof promedio !== 'number') return 'sin';
  if (promedio >= 4) return 'alto';
  if (promedio >= 3) return 'medio';
  return 'bajo';
}

export function etiquetaPin(bano) {
  const promedio = bano.calificacion_promedio;
  return typeof promedio === 'number' ? `🚽 ${promedio.toFixed(1)}★` : '🚽 sin calificaciones';
}
