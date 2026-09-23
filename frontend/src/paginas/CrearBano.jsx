import { useEffect, useRef, useState } from 'react';
import { crearBano } from '../api/banosApi';
import Detalle from './Detalle';

// AD-4: la búsqueda de duplicados de Story 2.4 reutiliza `distancia_metros`
// que ya trae `GET /banos` (calculado con el único Haversine del backend) —
// nunca reimplementa la fórmula aquí.
const RADIO_DUPLICADOS_METROS = 1500;

/**
 * Overlay a pantalla completa (mismo patrón que `Detalle`, nunca desmonta el
 * mapa debajo) para agregar un baño nuevo. Paso 1 (obligatorio, nunca
 * salteable): busca duplicados en los `banos` ya cargados por `Mapa.jsx`
 * dentro de un radio de 1.5km. Si hay uno, muestra ese baño con `Detalle` y
 * ahí termina el flujo. Si no hay ninguno, Paso 2 es el formulario de
 * creación. La ubicación (`ubicacion`) es la del dispositivo, ya resuelta
 * por `Mapa.jsx` — se captura una sola vez al abrir el flujo, nunca es un
 * campo editable ni un picker de mapa.
 */
export default function CrearBano({ ubicacion, banos, onVolver, onCreado, onReintentarUbicacion }) {
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('');
  const [tipoLugar, setTipoLugar] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const volverRef = useRef(null);
  const nombreRef = useRef(null);
  const zonaRef = useRef(null);
  const tipoLugarRef = useRef(null);

  // Mismo patrón que `Detalle`: al abrir el overlay, foco al botón Volver
  // (cuando este componente lo renderiza — el caso de duplicado delega el
  // foco al propio `Detalle`).
  useEffect(() => {
    volverRef.current?.focus();
  }, []);

  if (!ubicacion) {
    return (
      <div className="detalle-pantalla" role="dialog" aria-modal="true" aria-label="Agregar baño">
        <div className="detalle-nav">
          <button type="button" ref={volverRef} className="detalle-volver" aria-label="Volver" onClick={onVolver}>
            ←
          </button>
          <span>Agregar baño</span>
        </div>
        <div className="detalle-contenido">
          <div className="surface-tarjeta" role="alert">
            <p className="surface-titulo">Sin tu ubicación no podemos evitar duplicados 📍</p>
            <p>Actívala para poder agregar un baño nuevo por aquí.</p>
            <button type="button" className="boton-primario" onClick={onReintentarUbicacion}>
              Activar ubicación
            </button>
          </div>
        </div>
      </div>
    );
  }

  const duplicado = (banos || [])
    .filter((bano) => typeof bano.distancia_metros === 'number' && bano.distancia_metros <= RADIO_DUPLICADOS_METROS)
    .sort((a, b) => a.distancia_metros - b.distancia_metros)[0];

  // Duplicado encontrado: se reusa `Detalle` tal cual y ahí termina el
  // flujo — nunca se ofrece "crear de todos modos".
  if (duplicado) {
    return <Detalle bano={duplicado} onVolver={onVolver} />;
  }

  function validar() {
    const nuevosErrores = {};
    if (!nombre.trim()) {
      nuevosErrores.nombre = '¿Cómo se llama el baño? Escribe un nombre 🚽.';
    }
    if (!zona.trim()) {
      nuevosErrores.zona = 'Dinos en qué zona o colonia está 📍.';
    }
    if (!tipoLugar.trim()) {
      nuevosErrores.tipoLugar = 'Dinos qué tipo de lugar es 🏷️.';
    }
    return nuevosErrores;
  }

  function enfocarPrimerError(nuevosErrores) {
    if (nuevosErrores.nombre) {
      nombreRef.current?.focus();
    } else if (nuevosErrores.zona) {
      zonaRef.current?.focus();
    } else if (nuevosErrores.tipoLugar) {
      tipoLugarRef.current?.focus();
    }
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    if (enviando) return;
    setErrorGeneral('');

    const nuevosErrores = validar();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      enfocarPrimerError(nuevosErrores);
      return;
    }

    setEnviando(true);
    try {
      const nuevoBano = await crearBano({
        nombre: nombre.trim(),
        zona: zona.trim(),
        tipoLugar: tipoLugar.trim(),
        lat: ubicacion.lat,
        lng: ubicacion.lng,
      });
      onCreado?.(nuevoBano);
    } catch (err) {
      // El formulario nunca se pierde en un error de servidor — el usuario
      // puede reintentar sin volver a teclear todo.
      setErrorGeneral(err.message || 'No pudimos crear el baño 😬 — intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="detalle-pantalla" role="dialog" aria-modal="true" aria-label="Agregar baño">
      <div className="detalle-nav">
        <button type="button" ref={volverRef} className="detalle-volver" aria-label="Volver" onClick={onVolver}>
          ←
        </button>
        <span>Agregar baño</span>
      </div>

      <div className="detalle-contenido">
        <p className="surface-titulo crear-bano-intro">Ningún baño cerca 🎉 — sé leyenda, agrega este.</p>

        <form onSubmit={manejarEnvio} noValidate>
          <div className="campo">
            <label htmlFor="crearBanoNombre">Nombre</label>
            <input
              id="crearBanoNombre"
              type="text"
              placeholder="Ej. Café La Esquina"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              ref={nombreRef}
              aria-invalid={Boolean(errores.nombre)}
              className={errores.nombre ? 'con-error' : ''}
            />
            {errores.nombre && <p className="mensaje-error">{errores.nombre}</p>}
          </div>

          <div className="campo">
            <label htmlFor="crearBanoZona">Zona o colonia</label>
            <input
              id="crearBanoZona"
              type="text"
              placeholder="Ej. Roma Norte"
              value={zona}
              onChange={(e) => setZona(e.target.value)}
              ref={zonaRef}
              aria-invalid={Boolean(errores.zona)}
              className={errores.zona ? 'con-error' : ''}
            />
            {errores.zona && <p className="mensaje-error">{errores.zona}</p>}
          </div>

          <div className="campo">
            <label htmlFor="crearBanoTipoLugar">Tipo de lugar</label>
            <input
              id="crearBanoTipoLugar"
              type="text"
              placeholder="Ej. Cafetería"
              value={tipoLugar}
              onChange={(e) => setTipoLugar(e.target.value)}
              ref={tipoLugarRef}
              aria-invalid={Boolean(errores.tipoLugar)}
              className={errores.tipoLugar ? 'con-error' : ''}
            />
            {errores.tipoLugar && <p className="mensaje-error">{errores.tipoLugar}</p>}
          </div>

          {errorGeneral && (
            <p className="mensaje-error mensaje-error-general" role="alert">
              {errorGeneral}
            </p>
          )}

          <button type="submit" className="boton-primario" disabled={enviando}>
            Agregar baño 🚽
          </button>
        </form>
      </div>
    </div>
  );
}
