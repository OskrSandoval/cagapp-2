// Geolocalización falsa del modo demo local. Implementa la parte de la API
// de `navigator.geolocation` que usa la app (`watchPosition`, `clearWatch`,
// `getCurrentPosition`) y se controla desde afuera con `moverA` y `sacudir`.
// Cada emisión crea un objeto de posición nuevo, igual que un GPS real.

/**
 * `demoraFixMs` imita lo que tarda un fix real: `getCurrentPosition` y el
 * primer evento de `watchPosition` llegan después de esa demora (siempre
 * asíncronos, nunca dentro de la misma llamada).
 */
export function crearGpsDemo({ lat, lng, accuracy = 15 }, { demoraFixMs = 300 } = {}) {
  let actual = { lat, lng, accuracy };
  let siguienteId = 1;
  const observadores = new Map(); // id → { exito, temporizador }
  const pendientes = new Set(); // { exito, temporizador } de getCurrentPosition

  function crearPosicion() {
    return {
      coords: {
        latitude: actual.lat,
        longitude: actual.lng,
        accuracy: actual.accuracy,
        altitude: null,
        altitudeAccuracy: null,
        heading: null,
        speed: null,
      },
      timestamp: Date.now(),
    };
  }

  function resolverPendientes() {
    for (const pendiente of [...pendientes]) {
      clearTimeout(pendiente.temporizador);
      pendientes.delete(pendiente);
      pendiente.exito(crearPosicion());
    }
  }

  function emitir() {
    for (const observador of observadores.values()) {
      clearTimeout(observador.temporizador);
      observador.temporizador = null;
      observador.exito(crearPosicion());
    }
    resolverPendientes();
  }

  const geolocation = {
    watchPosition(exito) {
      const id = siguienteId++;
      const observador = { exito, temporizador: null };
      observador.temporizador = setTimeout(() => {
        observador.temporizador = null;
        if (observadores.has(id)) exito(crearPosicion());
      }, demoraFixMs);
      observadores.set(id, observador);
      return id;
    },
    clearWatch(id) {
      const observador = observadores.get(id);
      if (!observador) return;
      clearTimeout(observador.temporizador);
      observadores.delete(id);
    },
    getCurrentPosition(exito) {
      const pendiente = { exito, temporizador: null };
      pendiente.temporizador = setTimeout(() => {
        if (!pendientes.has(pendiente)) return;
        pendientes.delete(pendiente);
        exito(crearPosicion());
      }, demoraFixMs);
      pendientes.add(pendiente);
    },
  };

  return {
    geolocation,
    /** Nueva posición para los `watchPosition` activos y los `getCurrentPosition` pendientes. */
    moverA(nuevaLat, nuevaLng, nuevaAccuracy = actual.accuracy) {
      if (!Number.isFinite(nuevaLat) || !Number.isFinite(nuevaLng) || !Number.isFinite(nuevaAccuracy)) {
        throw new Error('moverA(lat, lng, accuracy?) necesita números');
      }
      actual = { lat: nuevaLat, lng: nuevaLng, accuracy: nuevaAccuracy };
      emitir();
      return { ...actual };
    },
    /** Vuelve a emitir la misma posición como un objeto nuevo (ruido de GPS). */
    sacudir() {
      emitir();
      return { ...actual };
    },
    posicionActual() {
      return { ...actual };
    },
    observadoresActivos() {
      return observadores.size;
    },
  };
}
