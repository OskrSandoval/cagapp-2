import { useEffect, useRef, useState } from 'react';
import { crearBano } from '../api/banosApi';
import Detalle from './Detalle';
import { formatearDistancia } from './distancia';

// AD-4: reutiliza `distancia_metros` que ya trae `GET /banos` (calculado con
// el único Haversine del backend) — nunca reimplementa la fórmula aquí.
// 200m es "el mismo lugar o la puerta de al lado"; un radio mayor bloqueaba
// zonas enteras con un solo baño.
const RADIO_BANOS_CERCANOS_METROS = 200;

function calcularCercanos(banos) {
  if (!banos) return null;
  return banos
    .filter((bano) => typeof bano.distancia_metros === 'number' && bano.distancia_metros <= RADIO_BANOS_CERCANOS_METROS)
    .sort((a, b) => a.distancia_metros - b.distancia_metros);
}

/**
 * Overlay a pantalla completa (mismo patrón que `Detalle`, nunca desmonta el
 * mapa debajo) para agregar un baño nuevo. Paso 1 (nunca salteable cuando
 * hay baños cerca): lista los `banos` ya cargados por `Mapa.jsx` a <=200m
 * para que el usuario decida si el suyo ya existe — tocar uno abre su
 * `Detalle` dentro de este mismo overlay; "Ninguno es este" abre el
 * formulario. Sin baños cerca, pasa directo al formulario. La ubicación
 * (`ubicacion`) es la del dispositivo, ya resuelta por `Mapa.jsx` — nunca es
 * un campo editable ni un picker de mapa.
 */
export default function CrearBano({ ubicacion, banos, onVolver, onCreado, onReintentarUbicacion, onCalificado }) {
  const [nombre, setNombre] = useState('');
  const [zona, setZona] = useState('');
  const [tipoLugar, setTipoLugar] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [quiereCrear, setQuiereCrear] = useState(false);
  const [seleccionado, setSeleccionado] = useState(null);
  // La lista se fija con la primera carga de `banos`: un refresco posterior
  // (p. ej. tras calificar desde un `Detalle` abierto aquí, o uno fallido que
  // deja `banos` en null) no debe cambiar la pantalla bajo los pies del
  // usuario ni convertir el formulario en lista a medio escribir.
  const [cercanos, setCercanos] = useState(() => calcularCercanos(banos));
  if (cercanos === null && banos) setCercanos(calcularCercanos(banos));
  const cargandoCercanos = cercanos === null;

  const volverRef = useRef(null);
  const nombreRef = useRef(null);
  const zonaRef = useRef(null);
  const tipoLugarRef = useRef(null);

  // Mismo patrón que `Detalle`: foco al botón Volver al abrir el overlay y
  // al regresar de un `Detalle` o pasar al formulario (el `Detalle`
  // maneja su propio foco mientras está abierto).
  useEffect(() => {
    if (!seleccionado) volverRef.current?.focus();
  }, [seleccionado, quiereCrear, ubicacion, cargandoCercanos]);

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

  if (cargandoCercanos) {
    return (
      <div className="detalle-pantalla" role="dialog" aria-modal="true" aria-label="Agregar baño">
        <div className="detalle-nav">
          <button type="button" ref={volverRef} className="detalle-volver" aria-label="Volver" onClick={onVolver}>
            ←
          </button>
          <span>Agregar baño</span>
        </div>
        <div className="detalle-contenido">
          <p className="surface-titulo crear-bano-intro" role="status">
            Buscando baños cerca 🔍…
          </p>
        </div>
      </div>
    );
  }

  if (seleccionado) {
    return <Detalle bano={seleccionado} onVolver={() => setSeleccionado(null)} onCalificado={onCalificado} />;
  }

  if (cercanos.length > 0 && !quiereCrear) {
    return (
      <div className="detalle-pantalla" role="dialog" aria-modal="true" aria-label="Agregar baño">
        <div className="detalle-nav">
          <button type="button" ref={volverRef} className="detalle-volver" aria-label="Volver" onClick={onVolver}>
            ←
          </button>
          <span>Agregar baño</span>
        </div>
        <div className="detalle-contenido">
          <p className="surface-titulo crear-bano-intro">
            ¿Es alguno de estos? 👀 Revisa antes de agregarlo.
          </p>
          <ul className="lista-cercanos" aria-label="Baños cerca de ti">
            {cercanos.map((bano) => (
              <li key={bano.id} className="fila-bano">
                <button type="button" className="fila-bano-boton" onClick={() => setSeleccionado(bano)}>
                  <span className="fila-bano-info">
                    <span className="fila-bano-nombre">{bano.nombre}</span>
                    <span className="fila-bano-meta">
                      {bano.tipo_lugar} · {formatearDistancia(bano.distancia_metros)}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
          <button type="button" className="boton-secundario" onClick={() => setQuiereCrear(true)}>
            Ninguno es este, crear nuevo ➕
          </button>
        </div>
      </div>
    );
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
        <button type="button" ref={volverRef} className="detalle-volver" aria-label="Volver" onClick={cercanos.length > 0 ? () => setQuiereCrear(false) : onVolver}>
          ←
        </button>
        <span>Agregar baño</span>
      </div>

      <div className="detalle-contenido">
        <p className="surface-titulo crear-bano-intro">
          {cercanos.length > 0
            ? 'Va, agrega el tuyo 🚽 — gracias por revisar.'
            : 'No hay baños a la redonda 🎉 — ¡estrénalo tú!'}
        </p>

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
