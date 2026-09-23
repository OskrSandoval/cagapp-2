import { etiquetaPin, nivelCalificacion } from './pinMapa';
import { formatearDistancia } from './distancia';

/**
 * Vista de Lista: mismos `banos` que el Mapa, ya ordenados por cercanía por
 * el backend. La tarjeta de estado (carga/vacío/error/buscador por zona) vive
 * en Mapa.jsx y se comparte, así que aquí solo se pintan las filas.
 *
 * `onSeleccionar(bano)` abre el Detalle (Story 2.3) — cada fila es tappable
 * a través de un botón real (no solo `onClick` en el `<li>`) para que quede
 * accesible por teclado.
 */
export default function Lista({ banos, onSeleccionar }) {
  if (!banos || banos.length === 0) return null;

  return (
    <ul className="lista-banos" data-testid="lista-banos">
      {banos.map((bano) => {
        const distancia = formatearDistancia(bano.distancia_metros);
        return (
          <li key={bano.id} className="fila-bano">
            <button type="button" className="fila-bano-boton" onClick={() => onSeleccionar?.(bano)}>
              <span className={`pin-en-fila pin-${nivelCalificacion(bano.calificacion_promedio)}`}>
                {etiquetaPin(bano)}
              </span>
              <div className="fila-bano-info">
                <p className="fila-bano-nombre">{bano.nombre}</p>
                <p className="fila-bano-meta">
                  {bano.zona}
                  {distancia ? ` · ${distancia}` : ''}
                </p>
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
