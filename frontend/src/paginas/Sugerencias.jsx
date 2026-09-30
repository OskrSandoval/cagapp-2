import { useEffect, useRef, useState } from 'react';
import { enviarSugerencia } from '../api/sugerenciasApi';
import EncabezadoOverlay from './EncabezadoOverlay';

export const MAX_CARACTERES_SUGERENCIA = 2000;

const TIPOS = [
  { valor: 'bug', etiqueta: 'Algo tronó 🐛' },
  { valor: 'sugerencia', etiqueta: 'Tengo una idea 💡' },
];

/**
 * Sugerencias: overlay a pantalla completa, mismo patrón que
 * `Perfil`. Buzón de solo escritura: tipo (bug o sugerencia) + texto libre.
 * El usuario y la fecha los pone el servidor. Si el envío falla, lo escrito
 * y el tipo se conservan para reintentar.
 */
export default function Sugerencias({ onVolver, onBuzonCerrado }) {
  const volverRef = useRef(null);
  const textoRef = useRef(null);

  const [tipo, setTipo] = useState('sugerencia');
  const [texto, setTexto] = useState('');
  const [errorTexto, setErrorTexto] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);
  // Mensaje del backend cuando el switch se apagó con la app abierta: el
  // reintento nunca va a funcionar, así que se quita el formulario.
  const [buzonCerrado, setBuzonCerrado] = useState('');

  useEffect(() => {
    volverRef.current?.focus();
  }, [enviado, buzonCerrado]);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    if (enviando) return;
    setErrorGeneral('');

    const textoLimpio = texto.trim();
    if (!textoLimpio) {
      setErrorTexto('Cuéntanos algo 💬 — el mensaje no puede ir vacío.');
      textoRef.current?.focus();
      return;
    }
    setErrorTexto('');

    setEnviando(true);
    try {
      await enviarSugerencia({ tipo, texto: textoLimpio });
      setEnviado(true);
    } catch (err) {
      if (err?.status === 404) {
        setBuzonCerrado(err.message || 'El buzón de sugerencias ya cerró 📪 — ¡gracias por la buena onda!');
        onBuzonCerrado?.();
        return;
      }
      setErrorGeneral(err?.message || 'No pudimos mandar tu mensaje 😬 — intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="detalle-pantalla" role="dialog" aria-modal="true" aria-label="Sugerencias">
      <EncabezadoOverlay titulo="Sugerencias" onVolver={onVolver} refVolver={volverRef} />

      <div className="detalle-contenido">
        {buzonCerrado ? (
          <div className="surface-tarjeta" role="status">
            <p className="surface-titulo">{buzonCerrado}</p>
            <button type="button" className="boton-primario" onClick={onVolver}>
              Volver
            </button>
          </div>
        ) : enviado ? (
          <div className="surface-tarjeta" role="status">
            <p className="surface-titulo">¡Recibido! Lo leemos con lupa 🔍</p>
            <p>Gracias por echarnos la mano a que CagApp quede de lujo.</p>
            <button type="button" className="boton-primario" onClick={onVolver}>
              Volver
            </button>
          </div>
        ) : (
          <>
            <p className="surface-titulo crear-bano-intro">
              ¿Algo tronó o se te ocurrió una idea? Cuéntanos, aquí nadie juzga 🚽
            </p>

            <form onSubmit={manejarEnvio} noValidate>
              <fieldset className="campo sugerencias-tipos">
                <legend>¿Qué nos cuentas?</legend>
                {TIPOS.map((opcion) => (
                  <label key={opcion.valor} className="sugerencias-tipo">
                    <input
                      type="radio"
                      name="sugerenciaTipo"
                      value={opcion.valor}
                      checked={tipo === opcion.valor}
                      onChange={() => setTipo(opcion.valor)}
                    />
                    {opcion.etiqueta}
                  </label>
                ))}
              </fieldset>

              <div className="campo">
                <label htmlFor="sugerenciaTexto">Tu mensaje</label>
                <textarea
                  id="sugerenciaTexto"
                  rows={6}
                  maxLength={MAX_CARACTERES_SUGERENCIA}
                  placeholder="Ej. El mapa se congela cuando…"
                  value={texto}
                  onChange={(e) => setTexto(e.target.value)}
                  ref={textoRef}
                  aria-invalid={Boolean(errorTexto)}
                  aria-describedby={errorTexto ? 'sugerenciaTextoError' : undefined}
                  className={errorTexto ? 'con-error' : ''}
                />
                {errorTexto && (
                  <p id="sugerenciaTextoError" className="mensaje-error">
                    {errorTexto}
                  </p>
                )}
              </div>

              {errorGeneral && (
                <p className="mensaje-error mensaje-error-general" role="alert">
                  {errorGeneral}
                </p>
              )}

              <button type="submit" className="boton-primario" disabled={enviando}>
                {enviando ? 'Enviando…' : 'Enviar 💬'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
