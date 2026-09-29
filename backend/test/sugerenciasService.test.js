import { describe, expect, it } from 'vitest';
import { crearSugerencia, sugerenciasActivas } from '../src/servicios/sugerenciasService.js';

function crearClienteFalso({ fila = { sugerencias_activas: true }, errorSelect = null, errorInsert = null } = {}) {
  const llamadas = { insert: [], tablas: [] };
  return {
    llamadas,
    from(tabla) {
      llamadas.tablas.push(tabla);
      if (tabla === 'configuracion') {
        return {
          select(columnas) {
            llamadas.select = columnas;
            return this;
          },
          eq(campo, valor) {
            llamadas.eq = [campo, valor];
            return this;
          },
          async maybeSingle() {
            if (errorSelect) return { data: null, error: errorSelect };
            return { data: fila, error: null };
          },
        };
      }
      return {
        insert(valores) {
          llamadas.insert.push(valores);
          return {
            select() {
              return {
                async single() {
                  if (errorInsert) return { data: null, error: errorInsert };
                  return { data: { id: 'sug-1', ...valores }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('crearSugerencia', () => {
  it('inserta solo usuario_id, tipo y texto en `sugerencias` y devuelve la fila', async () => {
    const cliente = crearClienteFalso();
    const fila = await crearSugerencia({ usuarioId: 'user-1', tipo: 'bug', texto: 'Se traba' }, cliente);

    expect(cliente.llamadas.tablas).toEqual(['sugerencias']);
    expect(cliente.llamadas.insert).toEqual([{ usuario_id: 'user-1', tipo: 'bug', texto: 'Se traba' }]);
    expect(fila).toEqual({ id: 'sug-1', usuario_id: 'user-1', tipo: 'bug', texto: 'Se traba' });
  });

  it('propaga un error legible si falla el insert', async () => {
    const cliente = crearClienteFalso({ errorInsert: { message: 'boom' } });
    await expect(crearSugerencia({ usuarioId: 'user-1', tipo: 'bug', texto: 'x' }, cliente)).rejects.toThrow('boom');
  });
});

describe('sugerenciasActivas', () => {
  it('lee la fila id = 1 de `configuracion` y devuelve true si está encendido', async () => {
    const cliente = crearClienteFalso();
    await expect(sugerenciasActivas(cliente)).resolves.toBe(true);
    expect(cliente.llamadas.tablas).toEqual(['configuracion']);
    expect(cliente.llamadas.eq).toEqual(['id', 1]);
  });

  it('devuelve false si está apagado', async () => {
    const cliente = crearClienteFalso({ fila: { sugerencias_activas: false } });
    await expect(sugerenciasActivas(cliente)).resolves.toBe(false);
  });

  it('sin fila cuenta como apagado', async () => {
    const cliente = crearClienteFalso({ fila: null });
    await expect(sugerenciasActivas(cliente)).resolves.toBe(false);
  });

  it('propaga un error legible si falla la lectura', async () => {
    const cliente = crearClienteFalso({ errorSelect: { message: 'boom' } });
    await expect(sugerenciasActivas(cliente)).rejects.toThrow('boom');
  });
});
