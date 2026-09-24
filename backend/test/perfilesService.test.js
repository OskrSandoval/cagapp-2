import { describe, expect, it } from 'vitest';
import { crearOActualizarPerfil, obtenerActividad, obtenerPerfilPorId } from '../src/servicios/perfilesService.js';

// Cliente Supabase falso en memoria, suficiente para probar el contrato de
// esta capa (upsert idempotente por id, maybeSingle -> null si no existe)
// sin pegarle a una base de datos real.
function crearClienteFalso({ error = null } = {}) {
  const filas = new Map();

  return {
    from() {
      return {
        upsert(valores) {
          return {
            select() {
              return {
                async single() {
                  if (error) return { data: null, error };
                  const existente = filas.get(valores.id) || {};
                  const fila = { ...existente, ...valores };
                  filas.set(valores.id, fila);
                  return { data: fila, error: null };
                },
              };
            },
          };
        },
        select() {
          return {
            eq(_campo, valor) {
              return {
                async maybeSingle() {
                  if (error) return { data: null, error };
                  return { data: filas.get(valor) || null, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('perfilesService.crearOActualizarPerfil', () => {
  it('crea el perfil con el id y el nombre para mostrar recibidos', async () => {
    const cliente = crearClienteFalso();
    const perfil = await crearOActualizarPerfil({ id: 'user-1', nombreParaMostrar: 'skr' }, cliente);
    expect(perfil).toEqual({ id: 'user-1', nombre_para_mostrar: 'skr' });
  });

  it('reintentar el mismo id no duplica ni falla — upsert idempotente', async () => {
    const cliente = crearClienteFalso();
    const primera = await crearOActualizarPerfil({ id: 'user-1', nombreParaMostrar: 'skr' }, cliente);
    const segunda = await crearOActualizarPerfil({ id: 'user-1', nombreParaMostrar: 'skr' }, cliente);

    expect(primera).toEqual(segunda);
    expect(segunda).toEqual({ id: 'user-1', nombre_para_mostrar: 'skr' });
  });

  it('propaga un error legible si Supabase falla', async () => {
    const cliente = crearClienteFalso({ error: { message: 'boom' } });
    await expect(crearOActualizarPerfil({ id: 'user-1', nombreParaMostrar: 'skr' }, cliente)).rejects.toThrow('boom');
  });
});

describe('perfilesService.obtenerPerfilPorId', () => {
  it('devuelve null si el usuario todavía no tiene perfil', async () => {
    const cliente = crearClienteFalso();
    const perfil = await obtenerPerfilPorId('user-sin-perfil', cliente);
    expect(perfil).toBeNull();
  });

  it('devuelve la fila si ya existe', async () => {
    const cliente = crearClienteFalso();
    await crearOActualizarPerfil({ id: 'user-1', nombreParaMostrar: 'skr' }, cliente);
    const perfil = await obtenerPerfilPorId('user-1', cliente);
    expect(perfil).toEqual({ id: 'user-1', nombre_para_mostrar: 'skr' });
  });
});

// Cliente Supabase falso que cubre las tres tablas que toca `obtenerActividad`
// (`checkins`, `baños`, `calificaciones`), cada una resuelta con `then` como
// hacen los fakes de `calificacionesService.test.js` para consultas que no
// terminan en `.single()`/`.maybeSingle()`.
function crearClienteActividad({ checkins = [], banos = [], calificaciones = [], errores = {} } = {}) {
  const llamadas = { eqCheckins: [], inBanos: [], eqCalificaciones: [], inCalificaciones: [] };

  return {
    llamadas,
    from(tabla) {
      if (tabla === 'checkins') {
        const consulta = {
          select() {
            return consulta;
          },
          eq(campo, valor) {
            llamadas.eqCheckins.push([campo, valor]);
            return consulta;
          },
          order() {
            return consulta;
          },
          then(resolver, rechazar) {
            return Promise.resolve(
              errores.checkins ? { data: null, error: errores.checkins } : { data: checkins, error: null }
            ).then(resolver, rechazar);
          },
        };
        return consulta;
      }

      if (tabla === 'baños') {
        const consulta = {
          select() {
            return consulta;
          },
          in(campo, valores) {
            llamadas.inBanos.push([campo, valores]);
            return consulta;
          },
          then(resolver, rechazar) {
            return Promise.resolve(
              errores.banos ? { data: null, error: errores.banos } : { data: banos, error: null }
            ).then(resolver, rechazar);
          },
        };
        return consulta;
      }

      if (tabla === 'calificaciones') {
        const consulta = {
          select() {
            return consulta;
          },
          eq(campo, valor) {
            llamadas.eqCalificaciones.push([campo, valor]);
            return consulta;
          },
          in(campo, valores) {
            llamadas.inCalificaciones.push([campo, valores]);
            return consulta;
          },
          then(resolver, rechazar) {
            return Promise.resolve(
              errores.calificaciones
                ? { data: null, error: errores.calificaciones }
                : { data: calificaciones, error: null }
            ).then(resolver, rechazar);
          },
        };
        return consulta;
      }

      throw new Error(`tabla inesperada: ${tabla}`);
    },
  };
}

describe('perfilesService.obtenerActividad', () => {
  it('usuario nuevo sin check-ins devuelve [] sin consultar baños ni calificaciones', async () => {
    const cliente = crearClienteActividad({ checkins: [] });
    const actividad = await obtenerActividad('user-1', cliente);
    expect(actividad).toEqual([]);
    expect(cliente.llamadas.inBanos).toHaveLength(0);
    expect(cliente.llamadas.inCalificaciones).toHaveLength(0);
    expect(cliente.llamadas.eqCheckins).toEqual([['usuario_id', 'user-1']]);
  });

  it('baño con check-in pero nunca calificado aparece con estrellas null (nunca vacío ni omitido)', async () => {
    const cliente = crearClienteActividad({
      checkins: [{ 'baño_id': 'bano-1', created_at: '2026-01-02T00:00:00Z' }],
      banos: [{ id: 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro' }],
      calificaciones: [],
    });

    const actividad = await obtenerActividad('user-1', cliente);

    expect(actividad).toEqual([
      { 'baño_id': 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro', estrellas: null },
    ]);
  });

  it('cruza cada baño visitado con su calificación vigente (reusa filtrarVigentesPorUsuarioYBano)', async () => {
    const cliente = crearClienteActividad({
      checkins: [
        { 'baño_id': 'bano-2', created_at: '2026-01-03T00:00:00Z' },
        { 'baño_id': 'bano-1', created_at: '2026-01-01T00:00:00Z' },
      ],
      banos: [
        { id: 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro' },
        { id: 'bano-2', nombre: 'Parque Dos', tipo_lugar: 'Parque', zona: 'Roma' },
      ],
      calificaciones: [
        { usuario_id: 'user-1', 'baño_id': 'bano-1', estrellas: 2, created_at: '2026-01-01T00:00:00Z', secuencia: 1 },
        { usuario_id: 'user-1', 'baño_id': 'bano-1', estrellas: 5, created_at: '2026-01-02T00:00:00Z', secuencia: 2 },
      ],
    });

    const actividad = await obtenerActividad('user-1', cliente);

    // Orden = check-in más reciente primero (bano-2 antes que bano-1); la
    // calificación de bano-1 es la vigente (5), no la vieja (2).
    expect(actividad).toEqual([
      { 'baño_id': 'bano-2', nombre: 'Parque Dos', tipo_lugar: 'Parque', zona: 'Roma', estrellas: null },
      { 'baño_id': 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro', estrellas: 5 },
    ]);
  });

  it('un mismo baño con varios check-ins aparece una sola vez', async () => {
    const cliente = crearClienteActividad({
      checkins: [
        { 'baño_id': 'bano-1', created_at: '2026-01-02T00:00:00Z' },
        { 'baño_id': 'bano-1', created_at: '2026-01-01T00:00:00Z' },
      ],
      banos: [{ id: 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro' }],
    });

    const actividad = await obtenerActividad('user-1', cliente);
    expect(actividad).toHaveLength(1);
  });

  it('nunca filtra por otro usuario: siempre usa el usuarioId recibido para checkins y calificaciones', async () => {
    const cliente = crearClienteActividad({
      checkins: [{ 'baño_id': 'bano-1', created_at: '2026-01-01T00:00:00Z' }],
      banos: [{ id: 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro' }],
    });

    await obtenerActividad('user-1', cliente);

    expect(cliente.llamadas.eqCheckins).toEqual([['usuario_id', 'user-1']]);
    expect(cliente.llamadas.eqCalificaciones).toEqual([['usuario_id', 'user-1']]);
  });

  it('propaga un error legible si falla la consulta de checkins', async () => {
    const cliente = crearClienteActividad({ errores: { checkins: { message: 'boom' } } });
    await expect(obtenerActividad('user-1', cliente)).rejects.toThrow('boom');
  });

  it('propaga un error legible si falla la consulta de baños', async () => {
    const cliente = crearClienteActividad({
      checkins: [{ 'baño_id': 'bano-1', created_at: '2026-01-01T00:00:00Z' }],
      errores: { banos: { message: 'boom' } },
    });
    await expect(obtenerActividad('user-1', cliente)).rejects.toThrow('boom');
  });

  it('propaga un error legible si falla la consulta de calificaciones', async () => {
    const cliente = crearClienteActividad({
      checkins: [{ 'baño_id': 'bano-1', created_at: '2026-01-01T00:00:00Z' }],
      banos: [{ id: 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro' }],
      errores: { calificaciones: { message: 'boom' } },
    });
    await expect(obtenerActividad('user-1', cliente)).rejects.toThrow('boom');
  });
});
