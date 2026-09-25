import { useState } from 'react';
import { hacerCheckin } from '../api/checkinsApi';

// AD-8: mismo radio de 150m que valida el backend; el chip es solo
// informativo (usa `distancia_metros` que el `bano` ya trae, sin recalcular
// Haversine acá) — nunca bloquea el botón de check-in, que siempre se puede
// tocar porque la validación real y autoritativa ocurre en el servidor.
const RADIO_CHECKIN_METROS = 150;

/**
 * Chip de rango + flujo de check-in (Story 3.1), extraído de `Detalle.jsx`
 * (retro Épica 3, action item #1: `Detalle.jsx` mezclaba esta lógica con la
 * del selector de calificación). Dueño de su propio intento de check-in
 * (geolocalización + `POST /checkins` + los 3 resultados de rechazo);
 * avisa a `Detalle` solo cuando un intento tiene éxito, vía `onConfirmado`.
 *
 * `mensajeInicial` es el mensaje de "tu check-in expiró mientras
 * calificabas" que `Detalle` pasa cuando este componente se vuelve a montar
 * después de que `SelectorCalificacion` recibió un 403 — no hace falta
 * ningún reset explícito para el resto de los reintentos: cada vez que
 * `Detalle` deja de mostrar el Selector y vuelve a mostrar este flujo, es
 * literalmente una instancia nueva (desmontar/montar), así que el estado
 * del intento anterior nunca sobrevive de un check-in exitoso al siguiente.
 */
export default function FlujoCheckin({ bano, mensajeInicial, onConfirmado }) {
  const [enviando, setEnviando] = useState(false);
  // 'fuera_de_rango' | 'precision_insuficiente' | 'error' | 'checkin_expirado' | null
  const [estado, setEstado] = useState(mensajeInicial ? 'checkin_expirado' : null);
  const [mensaje, setMensaje] = useState(mensajeInicial || '');

  const tieneDistancia = typeof bano.distancia_metros === 'number';
  const dentroDeRango = tieneDistancia && bano.distancia_metros <= RADIO_CHECKIN_METROS;

  // Pide una lectura fresca de geolocalización (mismo patrón puntual que
  // `reintentarUbicacion` de Mapa.jsx, nunca la ubicación ya cacheada del
  // mapa) y llama a `POST /checkins` con ella. El backend es la única
  // autoridad sobre "dentro de rango" — este botón siempre se puede tocar,
  // incluso si el chip de arriba (posiblemente desactualizado) dice "fuera
  // de rango".
  function pedirCheckin() {
    if (enviando) return;
    setMensaje('');
    setEstado(null);

    if (!navigator.geolocation) {
      setEstado('error');
      setMensaje('No pudimos ubicarte 📍 — activa tu ubicación e intenta de nuevo.');
      return;
    }

    setEnviando(true);
    navigator.geolocation.getCurrentPosition(
      async (posicion) => {
        const { latitude: lat, longitude: lng, accuracy } = posicion.coords;
        try {
          await hacerCheckin({ banoId: bano.id, lat, lng, accuracy });
          onConfirmado();
        } catch (err) {
          // AD-7: 403 = fuera de rango, 422 = precisión insuficiente — el
          // frontend distingue por código HTTP, nunca adivinando el texto.
          if (err?.status === 403) {
            setEstado('fuera_de_rango');
          } else if (err?.status === 422) {
            setEstado('precision_insuficiente');
          } else {
            setEstado('error');
          }
          setMensaje(err?.message || 'No pudimos registrar tu check-in 😬 — intenta de nuevo.');
        } finally {
          setEnviando(false);
        }
      },
      () => {
        // Permiso revocado o timeout: mismo tratamiento chusco que el resto
        // de la app, nunca truena la pantalla, siempre se puede reintentar.
        setEnviando(false);
        setEstado('error');
        setMensaje('No pudimos obtener tu ubicación 📍 — intenta de nuevo.');
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
    <>
      {tieneDistancia && (
        <span className={`chip-rango ${dentroDeRango ? 'chip-rango--dentro' : 'chip-rango--fuera'}`}>
          {dentroDeRango ? '✅ Dentro del rango (150m)' : '📍 Fuera del rango (150m)'}
        </span>
      )}

      {(estado === 'fuera_de_rango' || estado === 'error' || estado === 'checkin_expirado') && (
        <p className="mensaje-error" role="alert">
          {mensaje}
        </p>
      )}

      {estado === 'precision_insuficiente' && (
        <p className="mensaje-precision" role="alert">
          {mensaje}
        </p>
      )}

      <button type="button" className="boton-primario" onClick={pedirCheckin} disabled={enviando}>
        {enviando ? 'Verificando ubicación…' : 'Hacer check-in 📍'}
      </button>
    </>
  );
}
