import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviciosMock = vi.hoisted(() => ({
  calificarBano: vi.fn(),
}));

vi.mock('../src/servicios/calificacionesService.js', () => serviciosMock);

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

describe('POST /calificaciones', () => {
  const cuerpoValido = { bano_id: '11111111-1111-1111-1111-111111111111', estrellas: 4 };

  beforeEach(() => {
    serviciosMock.calificarBano.mockReset();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).post('/calificaciones').send(cuerpoValido);
    expect(respuesta.status).toBe(401);
    expect(serviciosMock.calificarBano).not.toHaveBeenCalled();
  });

  it('calificación válida responde 201 con el promedio actualizado y usa el id del token, nunca uno del body', async () => {
    serviciosMock.calificarBano.mockResolvedValue({
      resultado: 'valido',
      calificacion: { id: 'calificacion-1', usuario_id: 'user-1', 'baño_id': cuerpoValido.bano_id, estrellas: 4 },
      calificacionPromedio: 4,
    });

    const respuesta = await request(crearApp())
      .post('/calificaciones')
      .set(...auth)
      .send({ ...cuerpoValido, usuario_id: 'usuario-suplantado' });

    expect(respuesta.status).toBe(201);
    expect(respuesta.body).toEqual({
      id: 'calificacion-1',
      usuario_id: 'user-1',
      'baño_id': cuerpoValido.bano_id,
      estrellas: 4,
      calificacion_promedio: 4,
    });
    expect(serviciosMock.calificarBano).toHaveBeenCalledWith({
      usuarioId: 'user-1',
      banoId: cuerpoValido.bano_id,
      estrellas: 4,
    });
  });

  it('sin check-in vigente (o expirado) responde 403 y explica el motivo; nada se inserta', async () => {
    serviciosMock.calificarBano.mockResolvedValue({ resultado: 'sin_checkin_vigente' });

    const respuesta = await request(crearApp())
      .post('/calificaciones')
      .set(...auth)
      .send(cuerpoValido);

    expect(respuesta.status).toBe(403);
    expect(respuesta.body).toHaveProperty('error');
  });

  it.each([
    ['bano_id vacío', { ...cuerpoValido, bano_id: '' }],
    ['bano_id con formato inválido (no uuid)', { ...cuerpoValido, bano_id: 'no-es-un-uuid' }],
    ['estrellas en 0', { ...cuerpoValido, estrellas: 0 }],
    ['estrellas en 6', { ...cuerpoValido, estrellas: 6 }],
    ['estrellas no entera (media estrella)', { ...cuerpoValido, estrellas: 3.5 }],
    ['estrellas no numérica', { ...cuerpoValido, estrellas: 'mucho' }],
    ['estrellas ausente', { bano_id: cuerpoValido.bano_id }],
  ])('responde 400 si %s, sin llamar al servicio', async (_caso, cuerpo) => {
    const respuesta = await request(crearApp())
      .post('/calificaciones')
      .set(...auth)
      .send(cuerpo);
    expect(respuesta.status).toBe(400);
    expect(serviciosMock.calificarBano).not.toHaveBeenCalled();
  });

  it('responde 500 con error en formato AD-7 si el servicio falla (red/servidor) y no deja la petición colgada', async () => {
    serviciosMock.calificarBano.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp())
      .post('/calificaciones')
      .set(...auth)
      .send(cuerpoValido);
    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toHaveProperty('error');
  });
});
