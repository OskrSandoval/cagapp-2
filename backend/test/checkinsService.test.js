import { describe, expect, it } from 'vitest';
import { crearCheckin, evaluarDistanciaCheckin } from '../src/servicios/checkinsService.js';

const BANO = { id: 'bano-1', lat: 19.4326, lng: -99.1332 };

// Mismo punto que `BANO`: distancia real 0m, útil para variar solo `accuracy`.
const UBICACION_EXACTA = { lat: 19.4326, lng: -99.1332 };

function crearClienteFalso({ bano = BANO, errorBano = null, errorInsert = null } = {}) {
  const llamadas = { insert: [] };
  return {
    llamadas,
    from(tabla) {
      llamadas.tabla = tabla;
      if (tabla === 'baños') {
        return {
          select() {
            return this;
          },
          eq(campo, valor) {
            llamadas.eq = [campo, valor];
            return this;
          },
          async maybeSingle() {
            if (errorBano) return { data: null, error: errorBano };
            return { data: bano, error: null };
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
                  return { data: { id: 'checkin-1', ...valores }, error: null };
                },
              };
            },
          };
        },
      };
    },
  };
}

describe('evaluarDistanciaCheckin', () => {
  it('dentro de 150m con accuracy razonable es válido', () => {
    const resultado = evaluarDistanciaCheckin({ ...UBICACION_EXACTA, accuracy: 20 }, BANO);
    expect(resultado.resultado).toBe('valido');
  });

  it('exactamente en el límite (distanciaMinima === 150) es válido (<=150)', () => {
    // A ~19.4326,-99.1332 medio grado de latitud ~111.32km; usamos un offset
    // pequeño y accuracy 0 para caer justo en el límite de forma legible.
    const lejos = { lat: BANO.lat + 150 / 111320, lng: BANO.lng };
    const resultado = evaluarDistanciaCheckin({ ...lejos, accuracy: 0 }, BANO);
    expect(resultado.distanciaMinima).toBeCloseTo(150, 0);
    expect(resultado.resultado).toBe('valido');
  });

  it('fuera de 150m (incluso restando accuracy) es fuera_de_rango', () => {
    const lejos = { lat: BANO.lat + 500 / 111320, lng: BANO.lng };
    const resultado = evaluarDistanciaCheckin({ ...lejos, accuracy: 10 }, BANO);
    expect(resultado.resultado).toBe('fuera_de_rango');
  });

  it('accuracy > 100m es precisión insuficiente cuando no es un fuera_de_rango seguro', () => {
    const resultado = evaluarDistanciaCheckin({ ...UBICACION_EXACTA, accuracy: 150 }, BANO);
    expect(resultado.resultado).toBe('precision_insuficiente');
  });

  it('accuracy exactamente 100m sigue siendo confiable (no > 100)', () => {
    const resultado = evaluarDistanciaCheckin({ ...UBICACION_EXACTA, accuracy: 100 }, BANO);
    expect(resultado.resultado).toBe('valido');
  });

  it('un fuera_de_rango seguro gana aunque accuracy también sea mala (AD-8: ya no es ambiguo)', () => {
    const lejos = { lat: BANO.lat + 1000 / 111320, lng: BANO.lng };
    const resultado = evaluarDistanciaCheckin({ ...lejos, accuracy: 500 }, BANO);
    expect(resultado.resultado).toBe('fuera_de_rango');
  });
});

describe('crearCheckin', () => {
  it('baño inexistente devuelve bano_no_encontrado y no inserta nada', async () => {
    const cliente = crearClienteFalso({ bano: null });
    const resultado = await crearCheckin(
      { usuarioId: 'user-1', banoId: 'no-existe', ...UBICACION_EXACTA, accuracy: 10 },
      cliente
    );
    expect(resultado).toEqual({ resultado: 'bano_no_encontrado' });
    expect(cliente.llamadas.insert).toHaveLength(0);
  });

  it('fuera de rango no inserta nada', async () => {
    const cliente = crearClienteFalso();
    const lejos = { lat: BANO.lat + 500 / 111320, lng: BANO.lng };
    const resultado = await crearCheckin(
      { usuarioId: 'user-1', banoId: BANO.id, ...lejos, accuracy: 10 },
      cliente
    );
    expect(resultado).toEqual({ resultado: 'fuera_de_rango' });
    expect(cliente.llamadas.insert).toHaveLength(0);
  });

  it('precisión insuficiente no inserta nada', async () => {
    const cliente = crearClienteFalso();
    const resultado = await crearCheckin(
      { usuarioId: 'user-1', banoId: BANO.id, ...UBICACION_EXACTA, accuracy: 150 },
      cliente
    );
    expect(resultado).toEqual({ resultado: 'precision_insuficiente' });
    expect(cliente.llamadas.insert).toHaveLength(0);
  });

  it('check-in válido inserta usuario_id y baño_id (nunca lat/lng/accuracy, AD-13) y devuelve la fila', async () => {
    const cliente = crearClienteFalso();
    const resultado = await crearCheckin(
      { usuarioId: 'user-1', banoId: BANO.id, ...UBICACION_EXACTA, accuracy: 10 },
      cliente
    );

    expect(cliente.llamadas.tabla).toBe('checkins');
    expect(cliente.llamadas.insert).toEqual([{ usuario_id: 'user-1', 'baño_id': BANO.id }]);
    expect(resultado.resultado).toBe('valido');
    expect(resultado.checkin).toEqual({ id: 'checkin-1', usuario_id: 'user-1', 'baño_id': BANO.id });
  });

  it('propaga un error legible si falla la búsqueda del baño', async () => {
    const cliente = crearClienteFalso({ errorBano: { message: 'boom' } });
    await expect(
      crearCheckin({ usuarioId: 'user-1', banoId: BANO.id, ...UBICACION_EXACTA, accuracy: 10 }, cliente)
    ).rejects.toThrow('boom');
  });

  it('propaga un error legible si falla el insert', async () => {
    const cliente = crearClienteFalso({ errorInsert: { message: 'boom' } });
    await expect(
      crearCheckin({ usuarioId: 'user-1', banoId: BANO.id, ...UBICACION_EXACTA, accuracy: 10 }, cliente)
    ).rejects.toThrow('boom');
  });
});
