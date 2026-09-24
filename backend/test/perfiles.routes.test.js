import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviciosMock = vi.hoisted(() => ({
  crearOActualizarPerfil: vi.fn(),
  obtenerPerfilPorId: vi.fn(),
  obtenerActividad: vi.fn(),
}));

vi.mock('../src/servicios/perfilesService.js', () => serviciosMock);

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

describe('rutas /perfiles', () => {
  beforeEach(() => {
    serviciosMock.crearOActualizarPerfil.mockReset();
    serviciosMock.obtenerPerfilPorId.mockReset();
    serviciosMock.obtenerActividad.mockReset();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).get('/perfiles/yo');
    expect(respuesta.status).toBe(401);
  });

  it('rechaza peticiones con token inválido con 401', async () => {
    const respuesta = await request(crearApp()).get('/perfiles/yo').set('Authorization', 'Bearer token-malo');
    expect(respuesta.status).toBe(401);
  });

  it('POST /perfiles usa el id del token verificado, nunca el del body', async () => {
    serviciosMock.crearOActualizarPerfil.mockResolvedValue({ id: 'user-1', nombre_para_mostrar: 'skr' });

    const respuesta = await request(crearApp())
      .post('/perfiles')
      .set('Authorization', 'Bearer token-valido')
      .send({ nombre_para_mostrar: 'skr', id: 'usuario-suplantado' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id: 'user-1', nombre_para_mostrar: 'skr' });
    expect(serviciosMock.crearOActualizarPerfil).toHaveBeenCalledWith({ id: 'user-1', nombreParaMostrar: 'skr' });
  });

  it('POST /perfiles sin nombre_para_mostrar responde 400', async () => {
    const respuesta = await request(crearApp()).post('/perfiles').set('Authorization', 'Bearer token-valido').send({});
    expect(respuesta.status).toBe(400);
    expect(serviciosMock.crearOActualizarPerfil).not.toHaveBeenCalled();
  });

  it('reintentar POST /perfiles con la misma sesión no falla ni duplica', async () => {
    serviciosMock.crearOActualizarPerfil.mockResolvedValue({ id: 'user-1', nombre_para_mostrar: 'skr' });
    const app = crearApp();

    const primera = await request(app)
      .post('/perfiles')
      .set('Authorization', 'Bearer token-valido')
      .send({ nombre_para_mostrar: 'skr' });
    const segunda = await request(app)
      .post('/perfiles')
      .set('Authorization', 'Bearer token-valido')
      .send({ nombre_para_mostrar: 'skr' });

    expect(primera.status).toBe(200);
    expect(segunda.status).toBe(200);
    expect(serviciosMock.crearOActualizarPerfil).toHaveBeenCalledTimes(2);
  });

  it('GET /perfiles/yo responde 404 si el usuario no tiene perfil', async () => {
    serviciosMock.obtenerPerfilPorId.mockResolvedValue(null);
    const respuesta = await request(crearApp()).get('/perfiles/yo').set('Authorization', 'Bearer token-valido');
    expect(respuesta.status).toBe(404);
  });

  it('GET /perfiles/yo responde 200 con el perfil si existe', async () => {
    serviciosMock.obtenerPerfilPorId.mockResolvedValue({ id: 'user-1', nombre_para_mostrar: 'skr' });
    const respuesta = await request(crearApp()).get('/perfiles/yo').set('Authorization', 'Bearer token-valido');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id: 'user-1', nombre_para_mostrar: 'skr' });
  });

  it('rechaza GET /perfiles/yo/actividad sin token con 401', async () => {
    const respuesta = await request(crearApp()).get('/perfiles/yo/actividad');
    expect(respuesta.status).toBe(401);
    expect(serviciosMock.obtenerActividad).not.toHaveBeenCalled();
  });

  it('GET /perfiles/yo/actividad usa el id del token verificado, nunca uno pedido por query/param', async () => {
    serviciosMock.obtenerActividad.mockResolvedValue([]);

    const respuesta = await request(crearApp())
      .get('/perfiles/yo/actividad')
      .set('Authorization', 'Bearer token-valido');

    expect(respuesta.status).toBe(200);
    expect(serviciosMock.obtenerActividad).toHaveBeenCalledWith('user-1');
  });

  it('GET /perfiles/yo/actividad responde 200 con [] si no hay actividad (nunca 404)', async () => {
    serviciosMock.obtenerActividad.mockResolvedValue([]);
    const respuesta = await request(crearApp())
      .get('/perfiles/yo/actividad')
      .set('Authorization', 'Bearer token-valido');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([]);
  });

  it('GET /perfiles/yo/actividad responde 200 con la lista de actividad si existe', async () => {
    const actividad = [{ 'baño_id': 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro', estrellas: 5 }];
    serviciosMock.obtenerActividad.mockResolvedValue(actividad);
    const respuesta = await request(crearApp())
      .get('/perfiles/yo/actividad')
      .set('Authorization', 'Bearer token-valido');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual(actividad);
  });

  it('GET /perfiles/yo/actividad responde 500 de marca si el servicio falla', async () => {
    serviciosMock.obtenerActividad.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp())
      .get('/perfiles/yo/actividad')
      .set('Authorization', 'Bearer token-valido');
    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error).toBeTruthy();
  });
});
