import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviciosMock = vi.hoisted(() => ({
  listarBanos: vi.fn(),
  calcularDistanciaMetros: vi.fn(),
  crearBano: vi.fn(),
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
    serviciosMock.crearBano.mockReset();
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

describe('POST /banos', () => {
  const cuerpoValido = { nombre: 'Café Uno', zona: 'Centro', tipo_lugar: 'Cafetería', lat: 19.43, lng: -99.13 };

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).post('/banos').send(cuerpoValido);
    expect(respuesta.status).toBe(401);
    expect(serviciosMock.crearBano).not.toHaveBeenCalled();
  });

  it('crea el baño y usa el id del token verificado como creado_por, nunca el del body', async () => {
    serviciosMock.crearBano.mockResolvedValue({ id: 'bano-1', ...cuerpoValido, creado_por: 'user-1' });

    const respuesta = await request(crearApp())
      .post('/banos')
      .set(...auth)
      .send({ ...cuerpoValido, creado_por: 'usuario-suplantado' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ id: 'bano-1', ...cuerpoValido, creado_por: 'user-1' });
    expect(serviciosMock.crearBano).toHaveBeenCalledWith({
      nombre: 'Café Uno',
      lat: 19.43,
      lng: -99.13,
      tipoLugar: 'Cafetería',
      zona: 'Centro',
      creadoPor: 'user-1',
    });
  });

  it.each([
    ['nombre', { ...cuerpoValido, nombre: '' }],
    ['zona', { ...cuerpoValido, zona: '  ' }],
    ['tipo_lugar', { ...cuerpoValido, tipo_lugar: '' }],
  ])('responde 400 si falta %s', async (_campo, cuerpo) => {
    const respuesta = await request(crearApp())
      .post('/banos')
      .set(...auth)
      .send(cuerpo);
    expect(respuesta.status).toBe(400);
    expect(serviciosMock.crearBano).not.toHaveBeenCalled();
  });

  it('responde 400 si la ubicación es inválida o falta', async () => {
    for (const cuerpo of [
      { ...cuerpoValido, lat: undefined, lng: undefined },
      { ...cuerpoValido, lat: 'no-es-numero' },
      { ...cuerpoValido, lat: 95 },
    ]) {
      const respuesta = await request(crearApp())
        .post('/banos')
        .set(...auth)
        .send(cuerpo);
      expect(respuesta.status).toBe(400);
    }
    expect(serviciosMock.crearBano).not.toHaveBeenCalled();
  });

  it('responde 500 con error en formato AD-7 si el servicio falla', async () => {
    serviciosMock.crearBano.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp())
      .post('/banos')
      .set(...auth)
      .send(cuerpoValido);
    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toHaveProperty('error');
  });
});
