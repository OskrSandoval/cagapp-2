import { etiquetaPin, nivelCalificacion } from './pinMapa';

/** Formatea `distancia_metros` en m (<1km) o km (>=1km, un decimal). `null`-safe. */
function formatearDistancia(metros) {
  if (typeof metros !== 'number') return null;
  if (metros < 1000) return `${Math.round(metros)} m`;
  return `${(metros / 1000).toFixed(1)} km`;
}

/**
 * Vista de Lista: mismos `banos` que el Mapa, ya ordenados por cercanía por
 * el backend. La tarjeta de estado (carga/vacío/error/buscador por zona) vive
 * en Mapa.jsx y se comparte, así que aquí solo se pintan las filas.
 */
export default function Lista({ banos }) {
  if (!banos || banos.length === 0) return null;

  return (
    <ul className="lista-banos" data-testid="lista-banos">
      {banos.map((bano) => {
        const distancia = formatearDistancia(bano.distancia_metros);
        return (
          <li key={bano.id} className="fila-bano">
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
          </li>
        );
      })}
    </ul>
  );
}
