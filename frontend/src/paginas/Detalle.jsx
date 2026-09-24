import { useEffect, useRef, useState } from 'react';
import { formatearDistancia } from './distancia';
import { CAPTIONS_CALIFICACION, bandaCalificacion } from './calificacion';
import { formatearFechaRelativa } from './fechaRelativa';
import { hacerCheckin } from '../api/checkinsApi';
import { calificarBano, obtenerCalificacionesPublicas } from '../api/calificacionesApi';

const ESTRELLAS_POSIBLES = [1, 2, 3, 4, 5];

// AD-8: mismo radio de 150m que valida el backend; el chip es solo
// informativo (usa `distancia_metros` que el `bano` ya trae, sin recalcular
// Haversine acá) — nunca bloquea el botón de check-in, que siempre se puede
// tocar porque la validación real y autoritativa ocurre en el servidor.
const RADIO_CHECKIN_METROS = 150;

function estrellasEstaticas(banda) {
  return '★'.repeat(banda) + '☆'.repeat(5 - banda);
}

/**
 * Detalle de un baño (Story 2.3): overlay a pantalla completa dentro de
 * `mapa-pantalla`, nunca desmonta el lienzo de Leaflet debajo (mismo patrón
 * que el toggle de Lista en 2.2). Recibe el objeto `bano` ya en memoria (los
 * mismos campos que `GET /banos` desde 2.1) — nunca pide un baño por id.
 */
export default function Detalle({ bano, onVolver, onCalificado }) {
  const volverRef = useRef(null);

  // 'confirmado' | 'fuera_de_rango' | 'precision_insuficiente' | 'checkin_expirado' | 'error' | null
  const [estadoCheckin, setEstadoCheckin] = useState(null);
  const [mensajeCheckin, setMensajeCheckin] = useState('');
  const [enviandoCheckin, setEnviandoCheckin] = useState(false);

  // Selector de calificación (Story 3.2): solo existe mientras
  // `estadoCheckin === 'confirmado'` en esta misma apertura de Detalle — ver
  // Design Notes ("El Selector no persiste entre aperturas de Detalle").
  const [estrellasSeleccionadas, setEstrellasSeleccionadas] = useState(0);
  const [enviandoCalificacion, setEnviandoCalificacion] = useState(false);
  const [mensajeCalificacion, setMensajeCalificacion] = useState('');
  const [calificacionEnviada, setCalificacionEnviada] = useState(false);
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
  const tieneDistancia = typeof bano.distancia_metros === 'number';
  const dentroDeRango = tieneDistancia && bano.distancia_metros <= RADIO_CHECKIN_METROS;

  // Pide una lectura fresca de geolocalización (mismo patrón puntual que
  // `reintentarUbicacion` de Mapa.jsx, nunca la ubicación ya cacheada del
  // mapa) y llama a `POST /checkins` con ella. El backend es la única
  // autoridad sobre "dentro de rango" — este botón siempre se puede tocar,
  // incluso si el chip de arriba (posiblemente desactualizado) dice "fuera
  // de rango".
  function pedirCheckin() {
    if (enviandoCheckin) return;
    setMensajeCheckin('');
    setEstadoCheckin(null);
    // Cada check-in nuevo abre un ciclo de calificación fresco (permitido sin
    // límite, Story 3.1) — nunca arrastra el estado del selector de la vez
    // anterior en la misma apertura de Detalle.
    setEstrellasSeleccionadas(0);
    setMensajeCalificacion('');
    setCalificacionEnviada(false);

    if (!navigator.geolocation) {
      setEstadoCheckin('error');
      setMensajeCheckin('No pudimos ubicarte 📍 — activa tu ubicación e intenta de nuevo.');
      return;
    }

    setEnviandoCheckin(true);
    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const { latitude: lat, longitude: lng, accuracy } = posicion.coords;
        try {
          await hacerCheckin({ banoId: bano.id, lat, lng, accuracy });
          setEstadoCheckin('confirmado');
        } catch (err) {
          // AD-7: 403 = fuera de rango, 422 = precisión insuficiente — el
          // frontend distingue por código HTTP, nunca adivinando el texto.
          if (err?.status === 403) {
            setEstadoCheckin('fuera_de_rango');
          } else if (err?.status === 422) {
            setEstadoCheckin('precision_insuficiente');
          } else {
            setEstadoCheckin('error');
          }
          setMensajeCheckin(err?.message || 'No pudimos registrar tu check-in 😬 — intenta de nuevo.');
        } finally {
          setEnviandoCheckin(false);
        }
      },
      () => {
        // Permiso revocado o timeout: mismo tratamiento chusco que el resto
        // de la app, nunca truena la pantalla, siempre se puede reintentar.
        setEnviandoCheckin(false);
        setEstadoCheckin('error');
        setMensajeCheckin('No pudimos obtener tu ubicación 📍 — intenta de nuevo.');
      },
      // Mismo timeout que el `watchPosition` continuo de Mapa.jsx (nunca se
      // queda colgado en "Verificando ubicación…"). `enableHighAccuracy`
      // porque todo el check-in depende de precisión real — sin esto varios
      // navegadores caen a una ubicación aproximada por red, dando falsos
      // "fuera de rango"/"precisión insuficiente".
      { timeout: 10000, enableHighAccuracy: true }
    );
  }

  // Publica la calificación elegida (Story 3.2). El backend es la única
  // autoridad sobre "hay un check-in vigente" (ventana de 15 min) — un 403
  // aquí significa que expiró mientras el usuario decidía, y el frontend
  // regresa al flujo de "Hacer check-in" en vez de dejar el selector colgado
  // (I/O & Edge-Case Matrix de la spec), nunca lo trata como un error genérico.
  async function confirmarCalificacion() {
    if (enviandoCalificacion || estrellasSeleccionadas === 0) return;
    setMensajeCalificacion('');
    setEnviandoCalificacion(true);

    try {
      const resultado = await calificarBano({ banoId: bano.id, estrellas: estrellasSeleccionadas });
      setCalificacionEnviada(true);
      setPromedioLocal(
        typeof resultado?.calificacion_promedio === 'number' ? resultado.calificacion_promedio : estrellasSeleccionadas
      );
      onCalificado?.();
    } catch (err) {
      if (err?.status === 403) {
        setEstadoCheckin('checkin_expirado');
        setMensajeCheckin(
          err?.message || 'Tu check-in ya expiró ⏱️ — vuelve a hacer check-in para poder calificar.'
        );
      } else {
        // La estrella elegida no se pierde: se puede reintentar sin volver a
        // elegir (I/O & Edge-Case Matrix de la spec).
        setMensajeCalificacion(err?.message || 'No pudimos guardar tu calificación 😬 — intenta de nuevo.');
      }
    } finally {
      setEnviandoCalificacion(false);
    }
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
          {tieneDistancia && (
            <span className={`chip-rango ${dentroDeRango ? 'chip-rango--dentro' : 'chip-rango--fuera'}`}>
              {dentroDeRango ? '✅ Dentro del rango (150m)' : '📍 Fuera del rango (150m)'}
            </span>
          )}

          {estadoCheckin === 'confirmado' ? (
            <>
              <p className="banner-confirmacion" role="status">
                ¡Check-in registrado! Ya quedaste como testigo presencial 🕵️.
              </p>

              {calificacionEnviada ? (
                <p className="banner-confirmacion" role="status">
                  ¡Gracias por calificar! Tu voto ya cuenta 🌟.
                </p>
              ) : (
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

                  {mensajeCalificacion && (
                    <p className="mensaje-error" role="alert">
                      {mensajeCalificacion}
                    </p>
                  )}

                  <button
                    type="button"
                    className="boton-primario"
                    onClick={confirmarCalificacion}
                    disabled={estrellasSeleccionadas === 0 || enviandoCalificacion}
                  >
                    {enviandoCalificacion ? 'Enviando…' : 'Confirmar calificación'}
                  </button>
                </div>
              )}
            </>
          ) : (
            <>
              {(estadoCheckin === 'fuera_de_rango' ||
                estadoCheckin === 'error' ||
                estadoCheckin === 'checkin_expirado') && (
                <p className="mensaje-error" role="alert">
                  {mensajeCheckin}
                </p>
              )}

              {estadoCheckin === 'precision_insuficiente' && (
                <p className="mensaje-precision" role="alert">
                  {mensajeCheckin}
                </p>
              )}

              <button type="button" className="boton-primario" onClick={pedirCheckin} disabled={enviandoCheckin}>
                {enviandoCheckin ? 'Verificando ubicación…' : 'Hacer check-in 📍'}
              </button>
            </>
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
