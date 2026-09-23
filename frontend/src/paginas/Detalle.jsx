import { useEffect, useRef } from 'react';
import { formatearDistancia } from './distancia';
import { CAPTIONS_CALIFICACION, bandaCalificacion } from './calificacion';

function estrellasEstaticas(banda) {
  return '★'.repeat(banda) + '☆'.repeat(5 - banda);
}

/**
 * Detalle de un baño (Story 2.3): overlay a pantalla completa dentro de
 * `mapa-pantalla`, nunca desmonta el lienzo de Leaflet debajo (mismo patrón
 * que el toggle de Lista en 2.2). Recibe el objeto `bano` ya en memoria (los
 * mismos campos que `GET /banos` desde 2.1) — nunca pide un baño por id.
 */
export default function Detalle({ bano, onVolver }) {
  const volverRef = useRef(null);

  // Al abrir el overlay, mover el foco de teclado al botón Volver (sin
  // manejo de Escape, mínimo suficiente para un diálogo modal).
  useEffect(() => {
    volverRef.current?.focus();
  }, []);

  if (!bano) return null;

  const promedio = bano.calificacion_promedio;
  const tieneCalificacion = typeof promedio === 'number';
  const banda = tieneCalificacion ? bandaCalificacion(promedio) : null;
  const distancia = formatearDistancia(bano.distancia_metros);

  return (
    <div
      className="detalle-pantalla"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalle de ${bano.nombre}`}
    >
      <div className="detalle-nav">
        <button
          type="button"
          ref={volverRef}
          className="detalle-volver"
          aria-label="Volver"
          onClick={onVolver}
        >
          ←
        </button>
        <span>Detalle del baño</span>
      </div>

      <div className="detalle-contenido">
        <div className="detalle-hero">
          <div className="detalle-hero-top">
            <div className="detalle-icono" aria-hidden="true">
              🚽
            </div>
            <div>
              <p className="detalle-nombre">{bano.nombre}</p>
              <p className="detalle-subtitulo">
                {bano.tipo_lugar}
                {bano.zona ? ` · ${bano.zona}` : ''}
              </p>
            </div>
          </div>

          {tieneCalificacion ? (
            <div className="detalle-calificacion-fila">
              <span className="detalle-estrellas" aria-hidden="true">
                {estrellasEstaticas(banda)}
              </span>
              <span className="detalle-pill-calificacion">
                {promedio.toFixed(1)} ⭐ — {CAPTIONS_CALIFICACION[banda]}
              </span>
            </div>
          ) : (
            <p className="detalle-sin-calificacion">Sin calificaciones todavía 🤷</p>
          )}

          {distancia && (
            <p className="detalle-distancia">
              <span aria-hidden="true">📍</span> {distancia} de ti
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
