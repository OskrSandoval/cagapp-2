import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { obtenerBanosCercanos } from '../api/banosApi';
import { etiquetaPin, nivelCalificacion } from './pinMapa';
import Lista from './Lista';
import Detalle from './Detalle';
import CrearBano from './CrearBano';
import Perfil from './Perfil';

const CENTRO_CDMX = [19.4326, -99.1332];

// Filtro de distancia entre coordenadas crudo (no es Haversine, no viola
// AD-4): evita pedir baños en cada evento de watchPosition por ruido de GPS.
const UMBRAL_COORDENADAS = 0.0003;

function coordenadasCambiaronSuficiente(anterior, actual) {
  if (!anterior) return true;
  return (
    Math.abs(anterior.lat - actual.lat) > UMBRAL_COORDENADAS ||
    Math.abs(anterior.lng - actual.lng) > UMBRAL_COORDENADAS
  );
}

function crearIconoPin(bano) {
  return L.divIcon({
    className: 'pin-contenedor',
    html: `<span class="pin-calificacion pin-${nivelCalificacion(bano.calificacion_promedio)}">${etiquetaPin(bano)}</span>`,
    iconSize: null,
  });
}

export default function Mapa({ onCerrarSesion }) {
  const contenedorRef = useRef(null);
  const mapaRef = useRef(null);
  const capaBanosRef = useRef(null);
  const capaUsuarioRef = useRef(null);
  const peticionRef = useRef(0);
  const ultimaUbicacionSolicitadaRef = useRef(null);
  const centradoInicialRef = useRef(false);

  // 'localizando' | 'ubicado' | 'zona'
  const [modo, setModo] = useState(() => (navigator.geolocation ? 'localizando' : 'zona'));
  const [ubicacion, setUbicacion] = useState(null);
  const [banos, setBanos] = useState(null); // null = sin cargar todavía
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [textoZona, setTextoZona] = useState('');
  // 'mapa' | 'lista'
  const [vista, setVista] = useState('mapa');
  // Baño abierto en el Detalle; null = Detalle cerrado. Es la misma
  // referencia que vive en `banos` (no se clona) — solo "parece" congelada
  // porque `banos` se reemplaza por completo en cada refetch, nunca se muta
  // en su lugar. Estado local, sin router (ver spec 2.3).
  const [banoSeleccionado, setBanoSeleccionado] = useState(null);
  // Overlay de Crear Baño (Story 2.4); mismo patrón de no desmontar el mapa
  // que Detalle. Estado local, sin router.
  const [mostrandoCrearBano, setMostrandoCrearBano] = useState(false);
  // Overlay de Perfil (Story 4.1); mismo patrón de no desmontar el mapa que
  // Detalle/CrearBano. Reemplaza al botón "Cerrar sesión" que vivía suelto
  // acá (stopgap de 2.1, ver Design Notes de la spec 4.1) — ahora ese botón
  // vive dentro del propio Perfil.
  const [mostrandoPerfil, setMostrandoPerfil] = useState(false);

  // Inicializa Leaflet una sola vez (sin wrapper de React).
  useEffect(() => {
    const mapa = L.map(contenedorRef.current).setView(CENTRO_CDMX, 13);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapa);
    capaBanosRef.current = L.layerGroup().addTo(mapa);
    capaUsuarioRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;
    return () => {
      mapa.remove();
      mapaRef.current = null;
    };
  }, []);

  // Geolocalización del navegador; cualquier falla cae al buscador por zona.
  // watchPosition (no getCurrentPosition) para que la Lista se reordene sola
  // si el usuario se mueve; un umbral de coordenadas evita refetch en cada
  // evento (ruido de GPS).
  useEffect(() => {
    if (!navigator.geolocation) return;
    const idObservador = navigator.geolocation.watchPosition(
      (posicion) => {
        const { latitude: lat, longitude: lng } = posicion.coords;
        setUbicacion({ lat, lng });
        setModo('ubicado');
        if (coordenadasCambiaronSuficiente(ultimaUbicacionSolicitadaRef.current, { lat, lng })) {
          ultimaUbicacionSolicitadaRef.current = { lat, lng };
          cargarBanos({ lat, lng });
        }
      },
      // Una falla transitoria (timeout, señal perdida) no debe tirar al
      // usuario de vuelta al buscador por zona si ya tenía una ubicación
      // buena — solo cae a 'zona' mientras no se haya alcanzado 'ubicado'.
      () => setModo((actual) => (actual === 'ubicado' ? actual : 'zona')),
      { timeout: 10000 }
    );
    return () => navigator.geolocation.clearWatch(idObservador);
  }, []);

  // Al volver de Lista a Mapa el lienzo estuvo oculto (sin desmontarse);
  // Leaflet necesita que se le avise para no quedar con tamaño stale.
  useEffect(() => {
    if (vista === 'mapa') {
      mapaRef.current?.invalidateSize();
    }
  }, [vista]);

  async function cargarBanos(parametros) {
    const id = ++peticionRef.current;
    setCargando(true);
    setError(null);
    try {
      const resultado = await obtenerBanosCercanos(parametros);
      if (id === peticionRef.current) setBanos(resultado);
    } catch (falla) {
      if (id === peticionRef.current) {
        setBanos(null);
        setError(falla?.message || 'No pudimos traer los baños 😬 — intenta de nuevo.');
      }
    } finally {
      if (id === peticionRef.current) setCargando(false);
    }
  }

  // Dibuja mi ubicación. El marcador se mueve en cada evento de
  // watchPosition, pero el recentrado automático (setView) solo ocurre en el
  // primer fix — si no, cada tick de GPS pelearía contra el pan/zoom manual
  // del usuario.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa || !ubicacion) return;
    capaUsuarioRef.current.clearLayers();
    L.circleMarker([ubicacion.lat, ubicacion.lng], {
      radius: 8,
      color: '#ffffff',
      weight: 2,
      fillColor: '#d53c19',
      fillOpacity: 1,
    })
      .bindTooltip('Tú estás aquí')
      .addTo(capaUsuarioRef.current);
    if (!centradoInicialRef.current) {
      mapa.setView([ubicacion.lat, ubicacion.lng], 15);
      centradoInicialRef.current = true;
    }
  }, [ubicacion]);

  // Dibuja los pines de baños.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    capaBanosRef.current.clearLayers();
    if (!banos || banos.length === 0) return;
    const puntos = banos.map((bano) => {
      const marcador = L.marker([bano.lat, bano.lng], { icon: crearIconoPin(bano), title: bano.nombre });
      marcador.on('click', () => setBanoSeleccionado(bano));
      marcador.addTo(capaBanosRef.current);
      return [bano.lat, bano.lng];
    });
    if (!ubicacion) {
      mapa.fitBounds(puntos, { padding: [40, 40], maxZoom: 16 });
    }
  }, [banos, ubicacion]);

  // Botón "Activar ubicación" del bloqueo de Crear Baño (Story 2.4): pide un
  // fix puntual (no un watch nuevo) para reintentar el permiso sin duplicar
  // el `watchPosition` continuo de arriba. Si el usuario ya lo denegó a
  // nivel de navegador, esto vuelve a fallar en silencio y el mensaje
  // bloqueante sigue ahí — es lo máximo que se puede hacer sin salir de la
  // app a la configuración del sistema.
  function reintentarUbicacion() {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const { latitude: lat, longitude: lng } = posicion.coords;
        setUbicacion({ lat, lng });
        setModo('ubicado');
        ultimaUbicacionSolicitadaRef.current = { lat, lng };
        cargarBanos({ lat, lng });
      },
      () => {}
    );
  }

  function buscarPorZona(evento) {
    evento.preventDefault();
    const zona = textoZona.trim();
    if (!zona) return;
    cargarBanos({ zona });
  }

  const sinBanos = banos !== null && banos.length === 0 && !cargando;

  return (
    <div className="mapa-pantalla">
      <div
        ref={contenedorRef}
        className={`mapa-lienzo${vista === 'lista' ? ' mapa-lienzo--oculto' : ''}`}
        data-testid="lienzo-mapa"
      />

      {vista === 'lista' && <Lista banos={banos} onSeleccionar={setBanoSeleccionado} />}

      <button
        type="button"
        className="control-flotante control-izquierda control-icono"
        aria-label="Perfil"
        onClick={() => setMostrandoPerfil(true)}
      >
        👤
      </button>

      <button
        type="button"
        className="control-flotante control-derecha"
        onClick={() => setVista((actual) => (actual === 'mapa' ? 'lista' : 'mapa'))}
        aria-pressed={vista === 'lista'}
      >
        {vista === 'mapa' ? '☰ Ver lista' : '☰ Ver mapa'}
      </button>

      <div className="capa-estado">
        {modo === 'localizando' && <p className="surface-tarjeta">Buscando dónde andas 📍…</p>}

        {modo === 'zona' && (
          <form className="surface-tarjeta" onSubmit={buscarPorZona}>
            <p className="surface-titulo">Sin ubicación no hay drama 🙈 — dinos por dónde andas.</p>
            <div className="campo">
              <label htmlFor="zona-busqueda">Zona o colonia</label>
              <input
                id="zona-busqueda"
                type="text"
                value={textoZona}
                onChange={(e) => setTextoZona(e.target.value)}
                placeholder="Ej. Roma Norte"
              />
            </div>
            <button type="submit" className="boton-primario" disabled={cargando}>
              Buscar
            </button>
          </form>
        )}

        {cargando && (
          <p className="surface-tarjeta" role="status">
            Buscando baños… 🚽
          </p>
        )}

        {error && (
          <p className="surface-tarjeta mensaje-error" role="alert">
            {error}
          </p>
        )}

        {sinBanos && (
          <div className="surface-tarjeta" role="status">
            <p className="surface-titulo">Aquí no hay ni un baño registrado 🏜️</p>
            <p>¿Y si eres la primera persona en agregar uno? Sé leyenda.</p>
          </div>
        )}
      </div>

      <button type="button" className="fab-agregar" onClick={() => setMostrandoCrearBano(true)}>
        ➕ Agregar Baño
      </button>

      {banoSeleccionado && (
        <Detalle
          bano={banoSeleccionado}
          onVolver={() => setBanoSeleccionado(null)}
          onCalificado={() => {
            // Mismo patrón que `onCreado` de Story 2.4: refresca `banos` para
            // que el pin/lista reflejen el promedio recién recalculado. En
            // modo zona (geolocalización denegada) no hay `ubicacion` — cae
            // al mismo buscador por zona ya usado en `buscarPorZona`.
            if (ubicacion) cargarBanos({ lat: ubicacion.lat, lng: ubicacion.lng });
            else if (textoZona) cargarBanos({ zona: textoZona });
          }}
        />
      )}

      {mostrandoPerfil && (
        <Perfil onVolver={() => setMostrandoPerfil(false)} onCerrarSesion={onCerrarSesion} />
      )}

      {mostrandoCrearBano && (
        <CrearBano
          ubicacion={ubicacion}
          banos={banos}
          onVolver={() => setMostrandoCrearBano(false)}
          onReintentarUbicacion={reintentarUbicacion}
          onCreado={(nuevoBano) => {
            setMostrandoCrearBano(false);
            // Aterriza en el Detalle del baño recién creado (no de vuelta en
            // Mapa) — está a distancia 0 de sí mismo, exactamente donde
            // está el usuario, sin reimplementar Haversine para saberlo.
            setBanoSeleccionado({ ...nuevoBano, calificacion_promedio: null, distancia_metros: 0 });
            if (ubicacion) cargarBanos({ lat: ubicacion.lat, lng: ubicacion.lng });
          }}
        />
      )}
    </div>
  );
}
