import { useState } from 'react';
import { CAPTIONS_CALIFICACION } from './calificacion';
import { calificarBano } from '../api/calificacionesApi';

const ESTRELLAS_POSIBLES = [1, 2, 3, 4, 5];

/**
 * Selector de calificación (Story 3.2), extraído de `Detalle.jsx` (retro
 * Épica 3, action item #1). `Detalle` solo lo monta después de confirmar un
 * check-in en esta apertura — ese montaje/desmontaje natural (nunca sigue
 * vivo de un check-in al siguiente) es lo que le da un ciclo fresco a cada
 * calificación, sin necesitar ningún reset explícito.
 */
export default function SelectorCalificacion({ banoId, onCalificado, onExpirado }) {
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState(0);
  const [enviando, setEnviando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const [enviada, setEnviada] = useState(false);

  // Publica la calificación elegida. El backend es la única autoridad sobre
  // "hay un check-in vigente" (ventana de 15 min) — un 403 aquí significa
  // que expiró mientras el usuario decidía, y `Detalle` regresa al flujo de
  // "Hacer check-in" en vez de dejar este selector colgado (I/O &
  // Edge-Case Matrix de la spec 3.2), nunca lo trata como un error genérico.
  async function confirmarCalificacion() {
    if (enviando || estrellasSeleccionadas === 0) return;
    setMensaje('');
    setEnviando(true);

    try {
      const resultado = await calificarBano({ banoId, estrellas: estrellasSeleccionadas });
      setEnviada(true);
      onCalificado(
        typeof resultado?.calificacion_promedio === 'number' ? resultado.calificacion_promedio : estrellasSeleccionadas
      );
    } catch (err) {
      if (err?.status === 403) {
        onExpirado(err?.message || 'Tu check-in ya expiró ⏱️ — vuelve a hacer check-in para poder calificar.');
      } else {
        // La estrella elegida no se pierde: se puede reintentar sin volver a
        // elegir (I/O & Edge-Case Matrix de la spec).
        setMensaje(err?.message || 'No pudimos guardar tu calificación 😬 — intenta de nuevo.');
      }
    } finally {
      setEnviando(false);
    }
  }

  if (enviada) {
    return (
      <p className="banner-confirmacion" role="status">
        ¡Gracias por calificar! Tu voto ya cuenta 🌟.
      </p>
    );
  }

  return (
    <div className="calificacion-selector">
      <div className="calificacion-estrellas-fila">
        {ESTRELLAS_POSIBLES.map((valor) => (
          <button
            key={valor}
            type="button"
            className={`calificacion-estrella-boton${
              valor <= estrellasSeleccionadas ? ' calificacion-estrella-boton--activa' : ''
            }`}
            aria-label={`Calificar ${valor} de 5`}
            aria-pressed={valor <= estrellasSeleccionadas}
            onClick={() => setEstrellasSeleccionadas(valor)}
          >
            {valor <= estrellasSeleccionadas ? '★' : '☆'}
          </button>
        ))}
      </div>

      {estrellasSeleccionadas > 0 && (
        <p className="calificacion-caption-pill">{CAPTIONS_CALIFICACION[estrellasSeleccionadas]}</p>
      )}

      <ul className="calificacion-lista-referencia">
        {ESTRELLAS_POSIBLES.map((valor) => (
          <li
            key={valor}
            className={`calificacion-lista-fila${
              valor === estrellasSeleccionadas ? ' calificacion-lista-fila--seleccionada' : ''
            }`}
          >
            {valor} — {CAPTIONS_CALIFICACION[valor]}
          </li>
        ))}
      </ul>

      {mensaje && (
        <p className="mensaje-error" role="alert">
          {mensaje}
        </p>
      )}

      <button
        type="button"
        className="boton-primario"
        onClick={confirmarCalificacion}
        disabled={estrellasSeleccionadas === 0 || enviando}
      >
        {enviando ? 'Enviando…' : 'Confirmar calificación'}
      </button>
    </div>
  );
}
