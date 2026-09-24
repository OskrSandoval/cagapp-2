const MS_POR_DIA = 24 * 60 * 60 * 1000;

/**
 * Story 4.2: primer formateo de fecha relativa del proyecto, copy tomada
 * literalmente del mockup aprobado de Detalle (key-detalle-checkin.html):
 * "hace 2 días", "hace 1 semana", "hace 2 semanas" — no es una decisión
 * inventada, es la única referencia de tono para este dato en todo el
 * material de planeación. Mismo patrón de módulo compartido pequeño que
 * `distancia.js`/`calificacion.js`.
 */
export function formatearFechaRelativa(fechaIso) {
  // Clamp a 0: un reloj desincronizado entre cliente/servidor o un
  // `created_at` en el futuro nunca debe producir "hace -1 días".
  const diasTranscurridos = Math.max(
    0,
    Math.floor((Date.now() - new Date(fechaIso).getTime()) / MS_POR_DIA)
  );

  if (diasTranscurridos < 7) {
    return `hace ${diasTranscurridos} día${diasTranscurridos === 1 ? '' : 's'}`;
  }

  if (diasTranscurridos < 30) {
    const semanas = Math.floor(diasTranscurridos / 7);
    return `hace ${semanas} semana${semanas === 1 ? '' : 's'}`;
  }

  if (diasTranscurridos < 365) {
    const meses = Math.floor(diasTranscurridos / 30);
    return `hace ${meses} mes${meses === 1 ? '' : 'es'}`;
  }

  const anos = Math.floor(diasTranscurridos / 365);
  return `hace ${anos} año${anos === 1 ? '' : 's'}`;
}
