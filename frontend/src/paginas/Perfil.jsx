import { useEffect, useRef, useState } from 'react';
import { obtenerMiActividad } from '../api/perfilesApi';

function estrellasEstaticas(estrellas) {
  return '★'.repeat(estrellas) + '☆'.repeat(5 - estrellas);
}

/**
 * Perfil (Story 4.1): overlay a pantalla completa dentro de `mapa-pantalla`,
 * mismo patrón que `Detalle`/`CrearBano` — nunca desmonta el lienzo de
 * Leaflet debajo. Alcance deliberadamente mínimo (epic-4-context.md): sin
 * edición de perfil, sin foto, sin bio, solo la lista de actividad propia y
 * "Cerrar sesión" (que aquí es donde pertenece, ver Design Notes de la
 * spec — se mudó desde el botón top-left de Mapa.jsx).
 *
 * De solo lectura a propósito: ninguna fila navega al Detalle del baño, y no
 * se muestra fecha relativa (ninguna de las dos la pide el AC).
 */
export default function Perfil({ onVolver, onCerrarSesion }) {
  const volverRef = useRef(null);

  // 'cargando' | 'lista' | 'error'
  const [estado, setEstado] = useState('cargando');
  const [actividad, setActividad] = useState([]);
  const [mensajeError, setMensajeError] = useState('');

  useEffect(() => {
    volverRef.current?.focus();
  }, []);

  async function cargarActividad() {
    setEstado('cargando');
    setMensajeError('');
    try {
      const resultado = await obtenerMiActividad();
      setActividad(resultado || []);
      setEstado('lista');
    } catch (err) {
      setEstado('error');
      setMensajeError(err?.message || 'No pudimos revisar tu actividad 😬 — intenta de nuevo.');
    }
  }

  useEffect(() => {
    cargarActividad();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="detalle-pantalla" role="dialog" aria-modal="true" aria-label="Perfil">
      <div className="detalle-nav">
        <button type="button" ref={volverRef} className="detalle-volver" aria-label="Volver" onClick={onVolver}>
          ←
        </button>
        <span>Perfil</span>
      </div>

      <div className="detalle-contenido">
        {estado === 'cargando' && (
          <p className="surface-tarjeta" role="status">
            Revisando tu actividad… 🔍
          </p>
        )}

        {estado === 'error' && (
          <div className="surface-tarjeta" role="alert">
            <p className="surface-titulo">Se nos atoró la tubería 🚿</p>
            <p>{mensajeError}</p>
            <button type="button" className="boton-primario" onClick={cargarActividad}>
              Reintentar
            </button>
          </div>
        )}

        {estado === 'lista' && actividad.length === 0 && (
          <div className="surface-tarjeta perfil-estado-vacio" role="status">
            <p className="surface-titulo">Todavía no has dejado huella por aquí 👣</p>
            <p>Sal, haz check-in en el primer baño que te salve la vida y califícalo — tu voto cuenta 🌟.</p>
          </div>
        )}

        {estado === 'lista' && actividad.length > 0 && (
          <ul className="perfil-lista-actividad">
            {actividad.map((fila) => (
              <li key={fila['baño_id']} className="perfil-fila-actividad">
                <div className="perfil-fila-info">
                  <p className="perfil-fila-nombre">{fila.nombre}</p>
                  <p className="perfil-fila-meta">
                    {fila.tipo_lugar}
                    {fila.zona ? ` · ${fila.zona}` : ''}
                  </p>
                </div>
                {typeof fila.estrellas === 'number' ? (
                  <span className="perfil-fila-calificacion" aria-label={`${fila.estrellas} de 5 estrellas`}>
                    {estrellasEstaticas(fila.estrellas)}
                  </span>
                ) : (
                  <span className="perfil-fila-sin-calificar">Sin calificar todavía</span>
                )}
              </li>
            ))}
          </ul>
        )}

        <button type="button" className="boton-primario perfil-cerrar-sesion" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}
