import { useEffect, useRef, useState } from 'react';
import { formatearDistancia } from './distancia';
import { CAPTIONS_CALIFICACION, bandaCalificacion } from './calificacion';
import { hacerCheckin } from '../api/checkinsApi';

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
export default function Detalle({ bano, onVolver }) {
  const volverRef = useRef(null);

  // 'confirmado' | 'fuera_de_rango' | 'precision_insuficiente' | 'error' | null
  const [estadoCheckin, setEstadoCheckin] = useState(null);
  const [mensajeCheckin, setMensajeCheckin] = useState('');
  const [enviandoCheckin, setEnviandoCheckin] = useState(false);

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
            <p className="banner-confirmacion" role="status">
              ¡Check-in registrado! Ya quedaste como testigo presencial 🕵️.
            </p>
          ) : (
            <>
              {(estadoCheckin === 'fuera_de_rango' || estadoCheckin === 'error') && (
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
      </div>
    </div>
  );
}
