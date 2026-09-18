import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviciosMock = vi.hoisted(() => ({
  listarBanos: vi.fn(),
  calcularDistanciaMetros: vi.fn(),
}));

vi.mock('../src/servicios/banosService.js', () => serviciosMock);

vi.mock('../src/datos/supabaseAdmin.js', () => ({
  supabaseAdmin: {
    auth: {
      getUser: vi.fn(async (token) =>
        token === 'token-valido'
          ? { data: { user: { id: 'user-1' } }, error: null }
          : { data: null, error: { message: 'invalid token' } }
      ),
    },
  },
}));

const { crearApp } = await import('../src/app.js');
const auth = ['Authorization', 'Bearer token-valido'];

describe('rutas /banos', () => {
  beforeEach(() => {
    serviciosMock.listarBanos.mockReset();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).get('/banos?zona=Centro');
    expect(respuesta.status).toBe(401);
  });

  it('con lat y lng llama al servicio y responde 200', async () => {
    serviciosMock.listarBanos.mockResolvedValue([{ id: '1', nombre: 'Uno' }]);
    const respuesta = await request(crearApp())
      .get('/banos?lat=19.43&lng=-99.13')
      .set(...auth);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([{ id: '1', nombre: 'Uno' }]);
    expect(serviciosMock.listarBanos).toHaveBeenCalledWith({ lat: 19.43, lng: -99.13, zona: undefined });
  });

  it('con zona llama al servicio', async () => {
    serviciosMock.listarBanos.mockResolvedValue([]);
    const respuesta = await request(crearApp())
      .get('/banos?zona=Roma')
      .set(...auth);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
    expect(serviciosMock.listarBanos).toHaveBeenCalledWith({ lat: undefined, lng: undefined, zona: 'Roma' });
  });

  it('sin lat/lng ni zona responde 400', async () => {
    const respuesta = await request(crearApp())
      .get('/banos')
      .set(...auth);
    expect(respuesta.status).toBe(400);
    expect(serviciosMock.listarBanos).not.toHaveBeenCalled();
  });

  it('coordenadas inválidas o incompletas responden 400', async () => {
    for (const q of ['lat=abc&lng=1', 'lat=19.4', 'lat=95&lng=0']) {
      const respuesta = await request(crearApp())
        .get(`/banos?${q}`)
        .set(...auth);
      expect(respuesta.status).toBe(400);
    }
    expect(serviciosMock.listarBanos).not.toHaveBeenCalled();
  });

  it('responde 500 con error en formato AD-7 si el servicio falla', async () => {
    serviciosMock.listarBanos.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp())
      .get('/banos?zona=Roma')
      .set(...auth);
    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toHaveProperty('error');
  });
});
