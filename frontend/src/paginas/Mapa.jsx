import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { obtenerBanosCercanos } from '../api/banosApi';
import { etiquetaPin, nivelCalificacion } from './pinMapa';

const CENTRO_CDMX = [19.4326, -99.1332];

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

  // 'localizando' | 'ubicado' | 'zona'
  const [modo, setModo] = useState(() => (navigator.geolocation ? 'localizando' : 'zona'));
  const [ubicacion, setUbicacion] = useState(null);
  const [banos, setBanos] = useState(null); // null = sin cargar todavía
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [textoZona, setTextoZona] = useState('');

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
  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (posicion) => {
        const { latitude: lat, longitude: lng } = posicion.coords;
        setUbicacion({ lat, lng });
        setModo('ubicado');
        cargarBanos({ lat, lng });
      },
      () => setModo('zona'),
      { timeout: 10000 }
    );
  }, []);

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

  // Dibuja mi ubicación.
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
    mapa.setView([ubicacion.lat, ubicacion.lng], 15);
  }, [ubicacion]);

  // Dibuja los pines de baños.
  useEffect(() => {
    const mapa = mapaRef.current;
    if (!mapa) return;
    capaBanosRef.current.clearLayers();
    if (!banos || banos.length === 0) return;
    const puntos = banos.map((bano) => {
      const marcador = L.marker([bano.lat, bano.lng], { icon: crearIconoPin(bano), title: bano.nombre });
      const popup = document.createElement('span');
      popup.textContent = bano.nombre;
      marcador.bindPopup(popup).addTo(capaBanosRef.current);
      return [bano.lat, bano.lng];
    });
    if (!ubicacion) {
      mapa.fitBounds(puntos, { padding: [40, 40], maxZoom: 16 });
    }
  }, [banos, ubicacion]);

  function buscarPorZona(evento) {
    evento.preventDefault();
    const zona = textoZona.trim();
    if (!zona) return;
    cargarBanos({ zona });
  }

  const sinBanos = banos !== null && banos.length === 0 && !cargando;

  return (
    <div className="mapa-pantalla">
      <div ref={contenedorRef} className="mapa-lienzo" data-testid="lienzo-mapa" />

      <button type="button" className="control-flotante control-izquierda" onClick={onCerrarSesion}>
        Cerrar sesión
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

      {/* Stub: Story 2.4 lo reemplaza con el formulario real. */}
      <button type="button" className="fab-agregar">
        ➕ Agregar Baño
      </button>
    </div>
  );
}
