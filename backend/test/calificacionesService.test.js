import { describe, expect, it } from 'vitest';
import {
  calificarBano,
  filtrarVigentesPorUsuarioYBano,
  obtenerCalificacionesPublicas,
  obtenerCheckinVigente,
  obtenerPromediosPorBano,
} from '../src/servicios/calificacionesService.js';

const HACE_5_MIN = new Date(Date.now() - 5 * 60 * 1000).toISOString();
const HACE_20_MIN = new Date(Date.now() - 20 * 60 * 1000).toISOString();

function crearClienteCheckins({ fila = null, error = null } = {}) {
  return {
    from(tabla) {
      if (tabla !== 'checkins') throw new Error(`tabla inesperada: ${tabla}`);
      const consulta = {
        select() {
          return consulta;
        },
        eq() {
          return consulta;
        },
        order() {
          return consulta;
        },
        limit() {
          return consulta;
        },
        async maybeSingle() {
          if (error) return { data: null, error };
          return { data: fila, error: null };
        },
      };
      return consulta;
    },
  };
}

function crearClienteCalificaciones({ filas = [], error = null } = {}) {
  const llamadas = { in: [] };
  return {
    llamadas,
    from(tabla) {
      if (tabla !== 'calificaciones') throw new Error(`tabla inesperada: ${tabla}`);
      const consulta = {
        select() {
          return consulta;
        },
        in(campo, valores) {
          llamadas.in.push([campo, valores]);
          return consulta;
        },
        then(resolver, rechazar) {
          return Promise.resolve(error ? { data: null, error } : { data: filas, error: null }).then(
            resolver,
            rechazar
          );
        },
      };
      return consulta;
    },
  };
}

// Combina el patrón de check-ins (lectura) y calificaciones (insert + select)
// en un solo cliente falso, para probar `calificarBano` de punta a punta.
function crearClienteCalificarBano({ checkinFila = null, filasCalificaciones = [], errorInsert = null } = {}) {
  const llamadas = { insert: [] };
  let filas = [...filasCalificaciones];

  return {
    llamadas,
    from(tabla) {
      if (tabla === 'checkins') {
        const consulta = {
          select() {
            return consulta;
          },
          eq() {
            return consulta;
          },
          order() {
            return consulta;
          },
          limit() {
            return consulta;
          },
          async maybeSingle() {
            return { data: checkinFila, error: null };
          },
        };
        return consulta;
      }

      if (tabla === 'calificaciones') {
        return {
          insert(valores) {
            llamadas.insert.push(valores);
            return {
              select() {
                return {
                  async single() {
                    if (errorInsert) return { data: null, error: errorInsert };
                    const nuevaFila = {
                      id: 'calificacion-nueva',
                      ...valores,
                      created_at: new Date().toISOString(),
                      secuencia: 999,
                    };
                    filas = [...filas, nuevaFila];
                    return { data: nuevaFila, error: null };
                  },
                };
              },
            };
          },
          select() {
            const consulta = {
              in() {
                return consulta;
              },
              then(resolver, rechazar) {
                return Promise.resolve({ data: filas, error: null }).then(resolver, rechazar);
              },
            };
            return consulta;
          },
        };
      }

      throw new Error(`tabla inesperada: ${tabla}`);
    },
  };
}

describe('obtenerCheckinVigente', () => {
  it('check-in reciente (< 15 min) es vigente', async () => {
    const cliente = crearClienteCheckins({ fila: { id: 'checkin-1', created_at: HACE_5_MIN } });
    const resultado = await obtenerCheckinVigente({ usuarioId: 'user-1', banoId: 'bano-1' }, cliente);
    expect(resultado).toEqual({ id: 'checkin-1', created_at: HACE_5_MIN });
  });

  it('check-in viejo (> 15 min) ya no es vigente', async () => {
    const cliente = crearClienteCheckins({ fila: { id: 'checkin-1', created_at: HACE_20_MIN } });
    const resultado = await obtenerCheckinVigente({ usuarioId: 'user-1', banoId: 'bano-1' }, cliente);
    expect(resultado).toBeNull();
  });

  it('sin ningún check-in devuelve null', async () => {
    const cliente = crearClienteCheckins({ fila: null });
    const resultado = await obtenerCheckinVigente({ usuarioId: 'user-1', banoId: 'bano-1' }, cliente);
    expect(resultado).toBeNull();
  });

  it('propaga un error legible si falla la consulta', async () => {
    const cliente = crearClienteCheckins({ error: { message: 'boom' } });
    await expect(obtenerCheckinVigente({ usuarioId: 'user-1', banoId: 'bano-1' }, cliente)).rejects.toThrow('boom');
  });
});

describe('filtrarVigentesPorUsuarioYBano', () => {
  it('se queda con la fila más reciente por (usuario_id, baño_id)', () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 2, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 5, created_at: '2026-01-02T00:00:00Z', secuencia: 2 },
    ];
    expect(filtrarVigentesPorUsuarioYBano(filas)).toEqual([filas[1]]);
  });

  it('desempata por secuencia cuando created_at es idéntico', () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 1, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 4, created_at: '2026-01-01T00:00:00Z', secuencia: 2 },
    ];
    expect(filtrarVigentesPorUsuarioYBano(filas)).toEqual([filas[1]]);
  });

  it('usuarios distintos para el mismo baño cuentan cada uno por separado', () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 3, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u2', 'baño_id': 'b1', estrellas: 5, created_at: '2026-01-01T00:00:00Z', secuencia: 2 },
    ];
    expect(filtrarVigentesPorUsuarioYBano(filas)).toEqual(filas);
  });
});

describe('obtenerPromediosPorBano', () => {
  it('sin ids devuelve un objeto vacío sin consultar nada', async () => {
    expect(await obtenerPromediosPorBano([], crearClienteCalificaciones())).toEqual({});
  });

  it('promedia solo la fila vigente por usuario, no todo el historial', async () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 1, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 5, created_at: '2026-01-02T00:00:00Z', secuencia: 2 },
      { usuario_id: 'u2', 'baño_id': 'b1', estrellas: 3, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
    ];
    const cliente = crearClienteCalificaciones({ filas });
    const promedios = await obtenerPromediosPorBano(['b1'], cliente);

    // vigentes: u1 -> 5, u2 -> 3 => promedio (5+3)/2 = 4
    expect(promedios).toEqual({ b1: 4 });
    expect(cliente.llamadas.in).toEqual([['baño_id', ['b1']]]);
  });

  it('calcula un promedio independiente por cada baño pedido', async () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'b1', estrellas: 4, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u1', 'baño_id': 'b2', estrellas: 2, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
    ];
    const cliente = crearClienteCalificaciones({ filas });
    expect(await obtenerPromediosPorBano(['b1', 'b2'], cliente)).toEqual({ b1: 4, b2: 2 });
  });

  it('un baño sin calificaciones vigentes no aparece como llave', async () => {
    const cliente = crearClienteCalificaciones({ filas: [] });
    expect(await obtenerPromediosPorBano(['b1'], cliente)).toEqual({});
  });

  it('propaga un error legible si Supabase falla', async () => {
    const cliente = crearClienteCalificaciones({ error: { message: 'boom' } });
    await expect(obtenerPromediosPorBano(['b1'], cliente)).rejects.toThrow('boom');
  });
});

describe('calificarBano', () => {
  it('sin check-in vigente devuelve sin_checkin_vigente y no inserta nada', async () => {
    const cliente = crearClienteCalificarBano({ checkinFila: null });
    const resultado = await calificarBano({ usuarioId: 'user-1', banoId: 'bano-1', estrellas: 4 }, cliente);
    expect(resultado).toEqual({ resultado: 'sin_checkin_vigente' });
    expect(cliente.llamadas.insert).toHaveLength(0);
  });

  it('check-in expirado (> 15 min) también rechaza, mismo tratamiento que "sin check-in"', async () => {
    const cliente = crearClienteCalificarBano({ checkinFila: { id: 'checkin-1', created_at: HACE_20_MIN } });
    const resultado = await calificarBano({ usuarioId: 'user-1', banoId: 'bano-1', estrellas: 4 }, cliente);
    expect(resultado).toEqual({ resultado: 'sin_checkin_vigente' });
    expect(cliente.llamadas.insert).toHaveLength(0);
  });

  it('check-in vigente inserta la calificación (usuario_id del token, nunca del body) y devuelve el promedio recalculado', async () => {
    const cliente = crearClienteCalificarBano({ checkinFila: { id: 'checkin-1', created_at: HACE_5_MIN } });
    const resultado = await calificarBano({ usuarioId: 'user-1', banoId: 'bano-1', estrellas: 5 }, cliente);

    expect(cliente.llamadas.insert).toEqual([{ usuario_id: 'user-1', 'baño_id': 'bano-1', estrellas: 5 }]);
    expect(resultado.resultado).toBe('valido');
    expect(resultado.calificacion).toMatchObject({ usuario_id: 'user-1', 'baño_id': 'bano-1', estrellas: 5 });
    expect(resultado.calificacionPromedio).toBe(5);
  });

  it('recalificar el mismo baño reemplaza cuál cuenta para el promedio, sin borrar el historial', async () => {
    const filasPrevias = [
      { usuario_id: 'user-1', 'baño_id': 'bano-1', estrellas: 1, created_at: HACE_20_MIN, secuencia: 1 },
    ];
    const cliente = crearClienteCalificarBano({
      checkinFila: { id: 'checkin-2', created_at: HACE_5_MIN },
      filasCalificaciones: filasPrevias,
    });

    const resultado = await calificarBano({ usuarioId: 'user-1', banoId: 'bano-1', estrellas: 5 }, cliente);

    // Solo la fila nueva (más reciente) cuenta para el promedio de este usuario.
    expect(resultado.calificacionPromedio).toBe(5);
    // La fila anterior nunca se borra: sigue en la tabla (el insert es lo único
    // que ocurrió; no hubo update/delete).
    expect(cliente.llamadas.insert).toHaveLength(1);
  });

  it('propaga un error legible si falla el insert', async () => {
    const cliente = crearClienteCalificarBano({
      checkinFila: { id: 'checkin-1', created_at: HACE_5_MIN },
      errorInsert: { message: 'boom' },
    });
    await expect(calificarBano({ usuarioId: 'user-1', banoId: 'bano-1', estrellas: 3 }, cliente)).rejects.toThrow(
      'boom'
    );
  });
});

// Cliente Supabase falso que cubre las dos tablas que toca
// `obtenerCalificacionesPublicas` (`calificaciones`, `perfiles`), cada una
// resuelta con `then` como el resto de los fakes de este archivo.
function crearClientePublicas({
  calificaciones = [],
  perfiles = [],
  errorCalificaciones = null,
  errorPerfiles = null,
} = {}) {
  const llamadas = { eqCalificaciones: [], inPerfiles: [] };

  return {
    llamadas,
    from(tabla) {
      if (tabla === 'calificaciones') {
        const consulta = {
          select() {
            return consulta;
          },
          eq(campo, valor) {
            llamadas.eqCalificaciones.push([campo, valor]);
            return consulta;
          },
          then(resolver, rechazar) {
            return Promise.resolve(
              errorCalificaciones ? { data: null, error: errorCalificaciones } : { data: calificaciones, error: null }
            ).then(resolver, rechazar);
          },
        };
        return consulta;
      }

      if (tabla === 'perfiles') {
        const consulta = {
          select() {
            return consulta;
          },
          in(campo, valores) {
            llamadas.inPerfiles.push([campo, valores]);
            return consulta;
          },
          then(resolver, rechazar) {
            return Promise.resolve(
              errorPerfiles ? { data: null, error: errorPerfiles } : { data: perfiles, error: null }
            ).then(resolver, rechazar);
          },
        };
        return consulta;
      }

      throw new Error(`tabla inesperada: ${tabla}`);
    },
  };
}

describe('obtenerCalificacionesPublicas', () => {
  it('sin calificaciones para el baño devuelve [] sin consultar perfiles', async () => {
    const cliente = crearClientePublicas({ calificaciones: [] });
    expect(await obtenerCalificacionesPublicas('bano-1', cliente)).toEqual([]);
    expect(cliente.llamadas.inPerfiles).toHaveLength(0);
  });

  it('filtra por bano_id y devuelve solo la fila vigente de cada usuario, cruzada con nombre_para_mostrar, más recientes primero', async () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'bano-1', estrellas: 2, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
      { usuario_id: 'u1', 'baño_id': 'bano-1', estrellas: 5, created_at: '2026-01-05T00:00:00Z', secuencia: 2 },
      { usuario_id: 'u2', 'baño_id': 'bano-1', estrellas: 3, created_at: '2026-01-03T00:00:00Z', secuencia: 1 },
    ];
    const perfiles = [
      { id: 'u1', nombre_para_mostrar: 'Ana R.' },
      { id: 'u2', nombre_para_mostrar: 'Mario T.' },
    ];
    const cliente = crearClientePublicas({ calificaciones: filas, perfiles });

    const resultado = await obtenerCalificacionesPublicas('bano-1', cliente);

    expect(resultado).toEqual([
      { nombre_para_mostrar: 'Ana R.', estrellas: 5, created_at: '2026-01-05T00:00:00Z' },
      { nombre_para_mostrar: 'Mario T.', estrellas: 3, created_at: '2026-01-03T00:00:00Z' },
    ]);
    expect(cliente.llamadas.eqCalificaciones).toEqual([['baño_id', 'bano-1']]);
    expect(cliente.llamadas.inPerfiles).toEqual([['id', ['u1', 'u2']]]);
  });

  it('nunca incluye usuario_id (ni ningún otro campo) en las filas de la lista pública (AD-11)', async () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'bano-1', estrellas: 4, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
    ];
    const perfiles = [{ id: 'u1', nombre_para_mostrar: 'Ana R.' }];
    const cliente = crearClientePublicas({ calificaciones: filas, perfiles });

    const resultado = await obtenerCalificacionesPublicas('bano-1', cliente);

    resultado.forEach((fila) => {
      expect(fila).not.toHaveProperty('usuario_id');
      expect(Object.keys(fila).sort()).toEqual(['created_at', 'estrellas', 'nombre_para_mostrar']);
    });
  });

  it('propaga un error legible si falla la consulta de calificaciones', async () => {
    const cliente = crearClientePublicas({ errorCalificaciones: { message: 'boom' } });
    await expect(obtenerCalificacionesPublicas('bano-1', cliente)).rejects.toThrow('boom');
  });

  it('propaga un error legible si falla la consulta de perfiles', async () => {
    const filas = [
      { usuario_id: 'u1', 'baño_id': 'bano-1', estrellas: 4, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
    ];
    const cliente = crearClientePublicas({ calificaciones: filas, errorPerfiles: { message: 'boom' } });
    await expect(obtenerCalificacionesPublicas('bano-1', cliente)).rejects.toThrow('boom');
  });
});
