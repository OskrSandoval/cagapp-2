import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviciosMock = vi.hoisted(() => ({
  crearCheckin: vi.fn(),
}));

vi.mock('../src/servicios/checkinsService.js', () => serviciosMock);

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

describe('POST /checkins', () => {
  const cuerpoValido = { bano_id: '11111111-1111-1111-1111-111111111111', lat: 19.4326, lng: -99.1332, accuracy: 20 };

  beforeEach(() => {
    serviciosMock.crearCheckin.mockReset();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).post('/checkins').send(cuerpoValido);
    expect(respuesta.status).toBe(401);
    expect(serviciosMock.crearCheckin).not.toHaveBeenCalled();
  });

  it('check-in válido responde 201 y usa el id del token verificado, nunca uno del body', async () => {
    serviciosMock.crearCheckin.mockResolvedValue({ resultado: 'valido', checkin: { id: 'checkin-1' } });

    const respuesta = await request(crearApp())
      .post('/checkins')
      .set(...auth)
      .send({ ...cuerpoValido, usuario_id: 'usuario-suplantado' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({ id: 'checkin-1' });
    expect(serviciosMock.crearCheckin).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      banoId: '11111111-1111-1111-1111-111111111111',
      lat: 19.4326,
      lng: -99.1332,
      accuracy: 20,
    });
  });

  it('fuera de rango responde 403 con el motivo explícito; nada se inserta', async () => {
    serviciosMock.crearCheckin.mockResolvedValue({ resultado: 'fuera_de_rango' });
    const respuesta = await request(crearApp())
      .post('/checkins')
      .set(...auth)
      .send(cuerpoValido);
    expect(respuesta.status).toBe(403);
    expect(respuesta.body).toHaveProperty('error');
  });

  it('precisión insuficiente responde 422 (distinto de fuera de rango, no es un rechazo)', async () => {
    serviciosMock.crearCheckin.mockResolvedValue({ resultado: 'precision_insuficiente' });
    const respuesta = await request(crearApp())
      .post('/checkins')
      .set(...auth)
      .send(cuerpoValido);
    expect(respuesta.status).toBe(422);
    expect(respuesta.body).toHaveProperty('error');
  });

  it('baño inexistente responde 400, no un 500 genérico', async () => {
    serviciosMock.crearCheckin.mockResolvedValue({ resultado: 'bano_no_encontrado' });
    const respuesta = await request(crearApp())
      .post('/checkins')
      .set(...auth)
      .send(cuerpoValido);
    expect(respuesta.status).toBe(400);
    expect(respuesta.body).toHaveProperty('error');
  });

  it.each([
    ['bano_id vacío', { ...cuerpoValido, bano_id: '' }],
    ['bano_id con formato inválido (no uuid)', { ...cuerpoValido, bano_id: 'no-es-un-uuid' }],
    ['lat no numérica', { ...cuerpoValido, lat: 'no-es-numero' }],
    ['lng fuera de rango válido', { ...cuerpoValido, lng: 200 }],
    ['accuracy negativa', { ...cuerpoValido, accuracy: -5 }],
    ['accuracy no numérica', { ...cuerpoValido, accuracy: 'mucha' }],
  ])('responde 400 si %s', async (_caso, cuerpo) => {
    const respuesta = await request(crearApp())
      .post('/checkins')
      .set(...auth)
      .send(cuerpo);
    expect(respuesta.status).toBe(400);
    expect(serviciosMock.crearCheckin).not.toHaveBeenCalled();
  });

  it('responde 500 con error en formato AD-7 si el servicio falla (red/servidor) y no deja la petición colgada', async () => {
    serviciosMock.crearCheckin.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp())
      .post('/checkins')
      .set(...auth)
      .send(cuerpoValido);
    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toHaveProperty('error');
  });
});
