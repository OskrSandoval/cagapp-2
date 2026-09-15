import { describe, expect, it } from 'vitest';
import { crearOActualizarPerfil, obtenerPerfilPorId } from '../src/servicios/perfilesService.js';

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
