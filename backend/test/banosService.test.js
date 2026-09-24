import { describe, expect, it } from 'vitest';
import { calcularDistanciaMetros, crearBano, listarBanos } from '../src/servicios/banosService.js';

// `calificaciones` (Story 3.2) son las filas ya existentes que
// `obtenerPromediosPorBano` (calificacionesService.js) va a leer para
// calcular `calificacion_promedio` — nunca un valor fijo.
function crearClienteFalso({ filas = [], calificaciones = [], error = null, errorInsert = null } = {}) {
  const llamadas = { ilike: [], insert: [], in: [] };
  return {
    llamadas,
    from(tabla) {
      llamadas.tabla = tabla;

      if (tabla === 'calificaciones') {
        const consulta = {
          select() {
            return consulta;
          },
          in(campo, valores) {
            llamadas.in.push([campo, valores]);
            return consulta;
          },
          then(resolver, rechazar) {
            return Promise.resolve({ data: calificaciones, error: null }).then(resolver, rechazar);
          },
        };
        return consulta;
      }

      let resultado = filas;
      const consulta = {
        select() {
          return consulta;
        },
        ilike(campo, patron) {
          llamadas.ilike.push([campo, patron]);
          const termino = patron.replace(/^%|%$/g, '').replace(/\\/g, '').toLowerCase();
          resultado = resultado.filter((f) => f[campo].toLowerCase().includes(termino));
          return consulta;
        },
        insert(valores) {
          llamadas.insert.push(valores);
          return {
            select() {
              return {
                async single() {
                  if (errorInsert) return { data: null, error: errorInsert };
                  return { data: { id: 'nuevo-1', ...valores }, error: null };
                },
              };
            },
          };
        },
        then(resolver, rechazar) {
          return Promise.resolve(error ? { data: null, error } : { data: resultado, error: null }).then(
            resolver,
            rechazar
          );
        },
      };
      return consulta;
    },
  };
}

describe('calcularDistanciaMetros', () => {
  it('es 0 para el mismo punto', () => {
    expect(calcularDistanciaMetros({ lat: 19.43, lng: -99.13 }, { lat: 19.43, lng: -99.13 })).toBe(0);
  });

  it('calcula ~111km por grado de latitud', () => {
    const d = calcularDistanciaMetros({ lat: 0, lng: 0 }, { lat: 1, lng: 0 });
    expect(d).toBeGreaterThan(111000);
    expect(d).toBeLessThan(111400);
  });

  it('es simétrica y razonable en CDMX (Zócalo a Ángel ~3.7km)', () => {
    const zocalo = { lat: 19.4326, lng: -99.1332 };
    const angel = { lat: 19.427, lng: -99.1677 };
    const d = calcularDistanciaMetros(zocalo, angel);
    expect(d).toBeCloseTo(calcularDistanciaMetros(angel, zocalo), 6);
    expect(d).toBeGreaterThan(3500);
    expect(d).toBeLessThan(3900);
  });
});

describe('listarBanos', () => {
  const filas = [
    { id: '1', nombre: 'Lejos', lat: 19.5, lng: -99.1, tipo_lugar: 'café', zona: 'Polanco' },
    { id: '2', nombre: 'Cerca', lat: 19.4327, lng: -99.1333, tipo_lugar: 'plaza', zona: 'Centro' },
  ];

  it('agrega distancia, ordena por cercanía y sin filas de calificaciones el promedio es null (nunca 0)', async () => {
    const cliente = crearClienteFalso({ filas });
    const banos = await listarBanos({ lat: 19.4326, lng: -99.1332 }, cliente);
    expect(cliente.llamadas.tabla).toBe('calificaciones'); // última tabla consultada
    expect(banos.map((b) => b.id)).toEqual(['2', '1']);
    expect(banos[0].distancia_metros).toBeLessThan(banos[1].distancia_metros);
    expect(banos[0].calificacion_promedio).toBeNull();
    expect(banos[1].calificacion_promedio).toBeNull();
  });

  it('calcula el promedio real (Story 3.2) a partir de la fila vigente por usuario, nunca cacheado ni fijo en null', async () => {
    const calificaciones = [
      // '1' (Lejos): dos filas del mismo usuario — solo la más reciente cuenta.
      { usuario_id: 'u1', 'baño_id': '1', estrellas: 1, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u1', 'baño_id': '1', estrellas: 5, created_at: '2026-01-02T00:00:00Z', secuencia: 2 },
      // '2' (Cerca): sin ninguna calificación.
    ];
    const cliente = crearClienteFalso({ filas, calificaciones });
    const banos = await listarBanos({ lat: 19.4326, lng: -99.1332 }, cliente);

    const lejos = banos.find((b) => b.id === '1');
    const cerca = banos.find((b) => b.id === '2');
    expect(lejos.calificacion_promedio).toBe(5);
    expect(cerca.calificacion_promedio).toBeNull();
    expect(cliente.llamadas.in).toEqual([['baño_id', ['1', '2']]]);
  });

  it('filtra por zona con ILIKE y escapa comodines', async () => {
    const cliente = crearClienteFalso({ filas });
    expect(await listarBanos({ zona: 'pola%' }, cliente)).toEqual([]);
    expect(cliente.llamadas.ilike).toEqual([['zona', '%pola\\%%']]);

    const otros = await listarBanos({ zona: 'polanco' }, crearClienteFalso({ filas }));
    expect(otros).toHaveLength(1);
    expect(otros[0].distancia_metros).toBeNull();
  });

  it('devuelve lista vacía si no hay baños', async () => {
    expect(await listarBanos({ lat: 1, lng: 1 }, crearClienteFalso())).toEqual([]);
  });

  it('propaga un error legible si Supabase falla', async () => {
    await expect(listarBanos({ lat: 1, lng: 1 }, crearClienteFalso({ error: { message: 'boom' } }))).rejects.toThrow(
      'boom'
    );
  });
});

describe('crearBano', () => {
  it('inserta el baño con los campos en español y devuelve la fila creada', async () => {
    const cliente = crearClienteFalso();
    const bano = await crearBano(
      { nombre: 'Café Uno', lat: 19.43, lng: -99.13, tipoLugar: 'Cafetería', zona: 'Centro', creadoPor: 'user-1' },
      cliente
    );

    expect(cliente.llamadas.tabla).toBe('baños');
    expect(cliente.llamadas.insert).toEqual([
      { nombre: 'Café Uno', lat: 19.43, lng: -99.13, tipo_lugar: 'Cafetería', zona: 'Centro', creado_por: 'user-1' },
    ]);
    expect(bano).toEqual({
      id: 'nuevo-1',
      nombre: 'Café Uno',
      lat: 19.43,
      lng: -99.13,
      tipo_lugar: 'Cafetería',
      zona: 'Centro',
      creado_por: 'user-1',
    });
  });

  it('propaga un error legible si Supabase falla al insertar', async () => {
    const cliente = crearClienteFalso({ errorInsert: { message: 'boom' } });
    await expect(
      crearBano(
        { nombre: 'Café Uno', lat: 19.43, lng: -99.13, tipoLugar: 'Cafetería', zona: 'Centro', creadoPor: 'user-1' },
        cliente
      )
    ).rejects.toThrow('boom');
  });
});
