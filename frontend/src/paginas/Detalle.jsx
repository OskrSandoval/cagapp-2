import { useEffect, useRef, useState } from 'react';
import { formatearDistancia } from './distancia';
import { CAPTIONS_CALIFICACION, bandaCalificacion, estrellasEstaticas } from './calificacion';
import { formatearFechaRelativa } from './fechaRelativa';
import { obtenerCalificacionesPublicas } from '../api/calificacionesApi';
import FlujoCheckin from './FlujoCheckin';
import SelectorCalificacion from './SelectorCalificacion';

/**
 * Detalle de un baño (Story 2.3): overlay a pantalla completa dentro de
 * `mapa-pantalla`, nunca desmonta el lienzo de Leaflet debajo (mismo patrón
 * que el toggle de Lista en 2.2). Recibe el objeto `bano` ya en memoria (los
 * mismos campos que `GET /banos` desde 2.1) — nunca pide un baño por id.
 *
 * Cáscara de composición (retro Épica 3, action item #1): el flujo de
 * check-in (Story 3.1) y el selector de calificación (Story 3.2) viven en
 * `FlujoCheckin`/`SelectorCalificacion`, cada uno con su propio estado —
 * este componente solo decide cuál mostrar y guarda lo que de verdad es
 * suyo (el promedio a mostrar, "Lo que dice la gente").
 */
export default function Detalle({ bano, onVolver, onCalificado }) {
  const volverRef = useRef(null);

  // true una vez que el check-in de esta apertura tuvo éxito; desbloquea el
  // Selector de calificación en vez de mostrar el flujo de check-in.
  const [confirmado, setConfirmado] = useState(false);
  // Mensaje que `FlujoCheckin` muestra al volver a montarse si el check-in
  // expiró mientras el usuario decidía la calificación (403 reportado por
  // `SelectorCalificacion` vía `onExpirado`).
  const [mensajeExpiracion, setMensajeExpiracion] = useState('');
  // Override local del promedio para reflejarlo "de inmediato" (criterio de
  // aceptación) sin esperar a que Mapa.jsx vuelva a pedir `banos`. `null` =
  // todavía no se ha calificado en esta sesión, usar `bano.calificacion_promedio`.
  const [promedioLocal, setPromedioLocal] = useState(null);

  // "Lo que dice la gente" (Story 4.2): lista pública de calificaciones de
  // este baño. Se pide una sola vez al abrir, en base al promedio *original*
  // del `bano` recibido (nunca `promedioLocal`) — Design Notes: esta historia
  // no refresca la lista justo después de que el propio usuario califique en
  // esta misma apertura de Detalle, así que calificar aquí nunca dispara un
  // refetch.
  const [calificacionesPublicas, setCalificacionesPublicas] = useState([]);
  const [errorCalificacionesPublicas, setErrorCalificacionesPublicas] = useState('');

  const tieneCalificacionOriginal = typeof bano?.calificacion_promedio === 'number';

  // Al abrir el overlay, mover el foco de teclado al botón Volver (sin
  // manejo de Escape, mínimo suficiente para un diálogo modal).
  useEffect(() => {
    volverRef.current?.focus();
  }, []);

  useEffect(() => {
    if (!bano || !tieneCalificacionOriginal) {
      setCalificacionesPublicas([]);
      setErrorCalificacionesPublicas('');
      return undefined;
    }

    let cancelado = false;
    setErrorCalificacionesPublicas('');

    obtenerCalificacionesPublicas(bano.id)
      .then((lista) => {
        if (!cancelado) setCalificacionesPublicas(Array.isArray(lista) ? lista : []);
      })
      .catch((err) => {
        if (!cancelado) {
          setErrorCalificacionesPublicas(
            err?.message || 'No pudimos cargar las calificaciones 😬 — intenta de nuevo.'
          );
        }
      });

    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bano?.id, tieneCalificacionOriginal]);

  if (!bano) return null;

  const promedio = promedioLocal !== null ? promedioLocal : bano.calificacion_promedio;
  const tieneCalificacion = typeof promedio === 'number';
  const banda = tieneCalificacion ? bandaCalificacion(promedio) : null;
  const distancia = formatearDistancia(bano.distancia_metros);

  function manejarExpiracion(mensaje) {
    setConfirmado(false);
    setMensajeExpiracion(mensaje);
  }

  function manejarCalificado(nuevoPromedio) {
    setPromedioLocal(nuevoPromedio);
    onCalificado?.();
  }

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

        <div className="surface-tarjeta checkin-tarjeta">
          {confirmado ? (
            <>
              <p className="banner-confirmacion" role="status">
                ¡Check-in registrado! Ya quedaste como testigo presencial 🕵️.
              </p>
              <SelectorCalificacion
                banoId={bano.id}
                onCalificado={manejarCalificado}
                onExpirado={manejarExpiracion}
              />
            </>
          ) : (
            <FlujoCheckin
              bano={bano}
              mensajeInicial={mensajeExpiracion}
              onConfirmado={() => {
                setMensajeExpiracion('');
                setConfirmado(true);
              }}
            />
          )}
        </div>

        {tieneCalificacionOriginal && (
          <div className="section-mini">
            <h4>Lo que dice la gente</h4>
            {errorCalificacionesPublicas ? (
              <p className="mensaje-error" role="alert">
                {errorCalificacionesPublicas}
              </p>
            ) : (
              calificacionesPublicas.map((fila, indice) => (
                <div className="mini-row" key={`${fila.nombre_para_mostrar}-${fila.created_at}-${indice}`}>
                  <span>{fila.nombre_para_mostrar}</span>
                  <span>
                    {estrellasEstaticas(fila.estrellas)} {formatearFechaRelativa(fila.created_at)}
                  </span>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
