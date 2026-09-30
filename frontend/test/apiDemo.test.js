// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { MENSAJES, calcularDistanciaMetros, crearApiDemo } from '../src/demo/apiDemo.js';
import { UBICACION_INICIAL, USUARIO_DEMO_ID } from '../src/demo/datosDemo.js';

const { lat, lng } = UBICACION_INICIAL;
const qInicial = `/banos?lat=${lat}&lng=${lng}`;

// Punto a `metros` al norte de `origen` (1° de latitud ≈ 111,195 m).
const alNorte = (origen, metros) => ({ lat: origen.lat + metros / 111195, lng: origen.lng });

function banosCercanos(api, punto = UBICACION_INICIAL) {
  return api.manejarPeticion('GET', `/banos?lat=${punto.lat}&lng=${punto.lng}`).cuerpo;
}

describe('apiDemo — datos semilla', () => {
  it('trae ~6 baños con uno a ≤150m, otro entre 150 y 200m y el resto más lejos', () => {
    const banos = banosCercanos(crearApiDemo());
    expect(banos.length).toBeGreaterThanOrEqual(5);
    const distancias = banos.map((bano) => bano.distancia_metros);
    expect(distancias).toEqual([...distancias].sort((a, b) => a - b));
    expect(distancias[0]).toBeLessThanOrEqual(150);
    expect(distancias[1]).toBeGreaterThan(150);
    expect(distancias[1]).toBeLessThanOrEqual(200);
    expect(distancias.slice(2).every((d) => d > 200)).toBe(true);
  });

  it('algunos baños tienen calificación promedio y otros no', () => {
    const banos = banosCercanos(crearApiDemo());
    expect(banos.some((bano) => typeof bano.calificacion_promedio === 'number')).toBe(true);
    expect(banos.some((bano) => bano.calificacion_promedio === null)).toBe(true);
  });
});

describe('apiDemo — GET /banos', () => {
  it('200 con distancia_metros y calificacion_promedio', () => {
    const { status, cuerpo } = crearApiDemo().manejarPeticion('GET', qInicial);
    expect(status).toBe(200);
    expect(cuerpo[0]).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        nombre: expect.any(String),
        lat: expect.any(Number),
        lng: expect.any(Number),
        tipo_lugar: expect.any(String),
        zona: expect.any(String),
        distancia_metros: expect.any(Number),
      })
    );
    expect(cuerpo[0]).toHaveProperty('calificacion_promedio');
  });

  it('por zona filtra sin distancia', () => {
    const { status, cuerpo } = crearApiDemo().manejarPeticion('GET', '/banos?zona=condesa');
    expect(status).toBe(200);
    expect(cuerpo.length).toBeGreaterThan(0);
    expect(cuerpo.every((bano) => bano.zona === 'Condesa' && bano.distancia_metros === null)).toBe(true);
  });

  it('400 sin ubicación ni zona, y con coordenadas inválidas', () => {
    const api = crearApiDemo();
    expect(api.manejarPeticion('GET', '/banos')).toEqual({ status: 400, cuerpo: { error: MENSAJES.sinUbicacionNiZona } });
    expect(api.manejarPeticion('GET', '/banos?lat=abc&lng=1')).toEqual({
      status: 400,
      cuerpo: { error: MENSAJES.coordenadasQuery },
    });
  });
});

describe('apiDemo — POST /banos', () => {
  it('201 con la fila creada, que luego aparece en GET /banos a distancia 0', () => {
    const api = crearApiDemo();
    const { status, cuerpo } = api.manejarPeticion('POST', '/banos', {
      nombre: ' Oxxo Durango ',
      zona: 'Roma Norte',
      tipo_lugar: 'Tienda',
      lat,
      lng,
    });
    expect(status).toBe(201);
    expect(cuerpo).toEqual(
      expect.objectContaining({ nombre: 'Oxxo Durango', tipo_lugar: 'Tienda', creado_por: USUARIO_DEMO_ID, lat, lng })
    );
    const lista = banosCercanos(api);
    expect(lista[0].id).toBe(cuerpo.id);
    expect(lista[0].distancia_metros).toBe(0);
    expect(lista[0].calificacion_promedio).toBeNull();
  });

  it('400 con los mismos mensajes que el real cuando faltan campos', () => {
    const api = crearApiDemo();
    const base = { nombre: 'X', zona: 'Roma', tipo_lugar: 'Café', lat, lng };
    expect(api.manejarPeticion('POST', '/banos', { ...base, nombre: '' }).cuerpo.error).toBe(MENSAJES.sinNombre);
    expect(api.manejarPeticion('POST', '/banos', { ...base, zona: ' ' }).cuerpo.error).toBe(MENSAJES.sinZona);
    expect(api.manejarPeticion('POST', '/banos', { ...base, tipo_lugar: undefined }).cuerpo.error).toBe(MENSAJES.sinTipo);
    expect(api.manejarPeticion('POST', '/banos', { ...base, lat: 200 })).toEqual({
      status: 400,
      cuerpo: { error: MENSAJES.coordenadasCuerpo },
    });
    expect(api.manejarPeticion('POST', '/banos', { ...base, nombre: 'a'.repeat(101) }).cuerpo.error).toBe(
      MENSAJES.nombreLargo
    );
  });
});

describe('apiDemo — POST /checkins (regla de 150m y accuracy)', () => {
  const banoCercano = () => banosCercanos(crearApiDemo())[0];

  it('201 dentro de rango, sin guardar lat/lng/accuracy', () => {
    const api = crearApiDemo();
    const bano = banosCercanos(api)[0];
    const { status, cuerpo } = api.manejarPeticion('POST', '/checkins', { bano_id: bano.id, lat, lng, accuracy: 15 });
    expect(status).toBe(201);
    expect(Object.keys(cuerpo).sort()).toEqual(['baño_id', 'created_at', 'id', 'usuario_id']);
  });

  it('403 fuera de rango (>150m aun restando accuracy)', () => {
    const bano = banoCercano();
    const lejos = alNorte(bano, 200);
    const { status, cuerpo } = crearApiDemo().manejarPeticion('POST', '/checkins', {
      bano_id: bano.id,
      ...lejos,
      accuracy: 10,
    });
    expect(status).toBe(403);
    expect(cuerpo).toEqual({ error: MENSAJES.fueraDeRango });
  });

  it('422 si la precisión es peor que 100m y no es un fuera de rango seguro', () => {
    const bano = banoCercano();
    const { status, cuerpo } = crearApiDemo().manejarPeticion('POST', '/checkins', {
      bano_id: bano.id,
      ...alNorte(bano, 200),
      accuracy: 120,
    });
    expect(status).toBe(422);
    expect(cuerpo).toEqual({ error: MENSAJES.precisionInsuficiente });
  });

  it('el baño entre 150 y 200m queda fuera de rango con buena precisión desde el punto inicial', () => {
    const api = crearApiDemo();
    const segundo = banosCercanos(api)[1];
    expect(api.manejarPeticion('POST', '/checkins', { bano_id: segundo.id, lat, lng, accuracy: 5 }).status).toBe(403);
  });

  it('400 con id inválido o baño inexistente', () => {
    const api = crearApiDemo();
    expect(api.manejarPeticion('POST', '/checkins', { bano_id: 'nope', lat, lng, accuracy: 5 }).cuerpo.error).toBe(
      MENSAJES.banoIdInvalido
    );
    expect(
      api.manejarPeticion('POST', '/checkins', {
        bano_id: '00000000-0000-4000-8000-000000000000',
        lat,
        lng,
        accuracy: 5,
      })
    ).toEqual({ status: 400, cuerpo: { error: MENSAJES.banoNoEncontrado } });
  });
});

describe('apiDemo — calificaciones', () => {
  it('403 sin check-in vigente; 201 con calificacion_promedio después del check-in', () => {
    const api = crearApiDemo();
    const bano = banosCercanos(api)[0];
    expect(api.manejarPeticion('POST', '/calificaciones', { bano_id: bano.id, estrellas: 5 })).toEqual({
      status: 403,
      cuerpo: { error: MENSAJES.sinCheckinVigente },
    });

    api.manejarPeticion('POST', '/checkins', { bano_id: bano.id, lat, lng, accuracy: 10 });
    const { status, cuerpo } = api.manejarPeticion('POST', '/calificaciones', { bano_id: bano.id, estrellas: 3 });
    expect(status).toBe(201);
    expect(cuerpo).toEqual(expect.objectContaining({ estrellas: 3, 'baño_id': bano.id, calificacion_promedio: 4 }));
  });

  it('el check-in expira a los 15 minutos', () => {
    let reloj = Date.now();
    const api = crearApiDemo({ ahora: () => reloj });
    const bano = banosCercanos(api)[0];
    api.manejarPeticion('POST', '/checkins', { bano_id: bano.id, lat, lng, accuracy: 10 });
    reloj += 16 * 60 * 1000;
    expect(api.manejarPeticion('POST', '/calificaciones', { bano_id: bano.id, estrellas: 3 }).status).toBe(403);
  });

  it('400 con estrellas fuera de 1-5', () => {
    const api = crearApiDemo();
    const bano = banosCercanos(api)[0];
    expect(api.manejarPeticion('POST', '/calificaciones', { bano_id: bano.id, estrellas: 6 }).cuerpo.error).toBe(
      MENSAJES.estrellasInvalidas
    );
  });

  it('GET /calificaciones devuelve la forma pública sin usuario_id, más recientes primero', () => {
    const api = crearApiDemo();
    const conCalificaciones = banosCercanos(api).find((bano) => bano.calificacion_promedio !== null);
    const { status, cuerpo } = api.manejarPeticion('GET', `/calificaciones?bano_id=${conCalificaciones.id}`);
    expect(status).toBe(200);
    expect(cuerpo.length).toBeGreaterThan(0);
    for (const fila of cuerpo) {
      expect(Object.keys(fila).sort()).toEqual(['created_at', 'estrellas', 'nombre_para_mostrar']);
    }
    const fechas = cuerpo.map((fila) => fila.created_at);
    expect(fechas).toEqual([...fechas].sort().reverse());
    expect(api.manejarPeticion('GET', '/calificaciones').status).toBe(400);
  });
});

describe('apiDemo — perfiles', () => {
  it('GET /perfiles/yo devuelve un perfil autorizado', () => {
    const { status, cuerpo } = crearApiDemo().manejarPeticion('GET', '/perfiles/yo');
    expect(status).toBe(200);
    expect(cuerpo).toEqual(expect.objectContaining({ id: USUARIO_DEMO_ID, autorizado: true }));
  });

  it('GET /perfiles/yo/actividad trae la actividad semilla y suma los check-ins nuevos', () => {
    const api = crearApiDemo();
    const inicial = api.manejarPeticion('GET', '/perfiles/yo/actividad');
    expect(inicial.status).toBe(200);
    expect(inicial.cuerpo.length).toBe(1);
    expect(inicial.cuerpo[0]).toEqual(
      expect.objectContaining({ nombre: expect.any(String), zona: expect.any(String), estrellas: 4 })
    );

    const bano = banosCercanos(api)[0];
    api.manejarPeticion('POST', '/checkins', { bano_id: bano.id, lat, lng, accuracy: 10 });
    const despues = api.manejarPeticion('GET', '/perfiles/yo/actividad').cuerpo;
    expect(despues[0]).toEqual(expect.objectContaining({ 'baño_id': bano.id, estrellas: null }));
  });
});

describe('apiDemo — sugerencias y buzon()', () => {
  it('estado activo por defecto y POST 201', () => {
    const api = crearApiDemo();
    expect(api.manejarPeticion('GET', '/sugerencias/estado')).toEqual({ status: 200, cuerpo: { activas: true } });
    const { status, cuerpo } = api.manejarPeticion('POST', '/sugerencias', { tipo: 'bug', texto: ' Se ve raro ' });
    expect(status).toBe(201);
    expect(cuerpo).toEqual(expect.objectContaining({ tipo: 'bug', texto: 'Se ve raro' }));
    expect(api.estado().sugerencias).toHaveLength(1);
  });

  it('400 con tipo o texto inválidos', () => {
    const api = crearApiDemo();
    expect(api.manejarPeticion('POST', '/sugerencias', { tipo: 'queja', texto: 'x' }).cuerpo.error).toBe(
      MENSAJES.tipoSugerenciaInvalido
    );
    expect(api.manejarPeticion('POST', '/sugerencias', { tipo: 'bug', texto: '  ' }).cuerpo.error).toBe(
      MENSAJES.textoVacio
    );
    expect(api.manejarPeticion('POST', '/sugerencias', { tipo: 'bug', texto: 'a'.repeat(2001) }).status).toBe(400);
  });

  it('buzon(false) apaga el switch: estado false y POST 404', () => {
    const api = crearApiDemo();
    api.buzon(false);
    expect(api.manejarPeticion('GET', '/sugerencias/estado').cuerpo).toEqual({ activas: false });
    expect(api.manejarPeticion('POST', '/sugerencias', { tipo: 'bug', texto: 'x' })).toEqual({
      status: 404,
      cuerpo: { error: MENSAJES.buzonCerrado },
    });
    api.buzon(true);
    expect(api.manejarPeticion('GET', '/sugerencias/estado').cuerpo).toEqual({ activas: true });
  });

  it('buzon() sin un booleano lanza y no toca el switch', () => {
    const api = crearApiDemo();
    expect(() => api.buzon()).toThrow(TypeError);
    expect(() => api.buzon('false')).toThrow(TypeError);
    expect(() => api.buzon(0)).toThrow(TypeError);
    expect(api.manejarPeticion('GET', '/sugerencias/estado').cuerpo).toEqual({ activas: true });
  });
});

describe('apiDemo — fallarSiguiente()', () => {
  it('solo la siguiente petición a esa ruta responde 500 con { error }', () => {
    const api = crearApiDemo();
    api.fallarSiguiente('/banos');
    expect(api.manejarPeticion('GET', '/perfiles/yo').status).toBe(200);
    expect(api.manejarPeticion('GET', qInicial)).toEqual({ status: 500, cuerpo: { error: MENSAJES.errorBanos } });
    expect(api.manejarPeticion('GET', qInicial).status).toBe(200);
  });

  it('usa el mensaje del controlador de esa ruta', () => {
    const api = crearApiDemo();
    api.fallarSiguiente('/checkins');
    expect(api.manejarPeticion('POST', '/checkins', {})).toEqual({
      status: 500,
      cuerpo: { error: MENSAJES.errorCheckin },
    });
  });
});

describe('apiDemo — estado() y rutas desconocidas', () => {
  it('estado() incluye los perfiles', () => {
    const { perfiles } = crearApiDemo().estado();
    expect(perfiles).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: USUARIO_DEMO_ID, autorizado: true })])
    );
  });

  it('estado() es una copia: mutarla no cambia la API', () => {
    const api = crearApiDemo();
    api.estado().banos.length = 0;
    expect(api.estado().banos.length).toBeGreaterThan(0);
  });

  it('404 con { error } en rutas que no existen', () => {
    expect(crearApiDemo().manejarPeticion('DELETE', '/banos').status).toBe(404);
  });

  it('Haversine propio: ~111km por grado de latitud', () => {
    expect(calcularDistanciaMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 })).toBeCloseTo(111195, -1);
  });
});
