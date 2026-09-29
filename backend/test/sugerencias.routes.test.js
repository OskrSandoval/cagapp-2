import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const serviciosMock = vi.hoisted(() => ({
  crearSugerencia: vi.fn(),
  sugerenciasActivas: vi.fn(),
}));

vi.mock('../src/servicios/sugerenciasService.js', () => serviciosMock);

const perfilesMock = vi.hoisted(() => ({
  obtenerPerfilPorId: vi.fn(async () => ({ id: 'user-1', autorizado: true })),
}));

vi.mock('../src/servicios/perfilesService.js', () => perfilesMock);

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

describe('GET /sugerencias/estado', () => {
  beforeEach(() => {
    serviciosMock.sugerenciasActivas.mockReset();
  });

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).get('/sugerencias/estado');
    expect(respuesta.status).toBe(401);
    expect(serviciosMock.sugerenciasActivas).not.toHaveBeenCalled();
  });

  it('responde { activas: true } con el switch encendido', async () => {
    serviciosMock.sugerenciasActivas.mockResolvedValue(true);
    const respuesta = await request(crearApp()).get('/sugerencias/estado').set(...auth);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ activas: true });
  });

  it('responde { activas: false } con el switch apagado o sin fila', async () => {
    serviciosMock.sugerenciasActivas.mockResolvedValue(false);
    const respuesta = await request(crearApp()).get('/sugerencias/estado').set(...auth);
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ activas: false });
  });

  it('responde 500 de marca si no puede leer el switch', async () => {
    serviciosMock.sugerenciasActivas.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp()).get('/sugerencias/estado').set(...auth);
    expect(respuesta.status).toBe(500);
    expect(respuesta.body.error).toBeTruthy();
  });
});

describe('POST /sugerencias', () => {
  const cuerpoValido = { tipo: 'bug', texto: 'El mapa se congela 🧊' };

  beforeEach(() => {
    serviciosMock.crearSugerencia.mockReset();
    serviciosMock.sugerenciasActivas.mockReset();
    serviciosMock.sugerenciasActivas.mockResolvedValue(true);
  });

  it('rechaza peticiones sin token con 401', async () => {
    const respuesta = await request(crearApp()).post('/sugerencias').send(cuerpoValido);
    expect(respuesta.status).toBe(401);
    expect(serviciosMock.crearSugerencia).not.toHaveBeenCalled();
  });

  it.each(['bug', 'sugerencia'])(
    'envío válido (%s) responde 201, recorta el texto y usa el id del token, nunca uno del body',
    async (tipo) => {
      serviciosMock.crearSugerencia.mockResolvedValue({ id: 'sug-1' });

      const respuesta = await request(crearApp())
        .post('/sugerencias')
        .set(...auth)
        .send({ tipo, texto: '  Agreguen filtros  ', usuario_id: 'usuario-suplantado', lat: 19.4 });

      expect(respuesta.status).toBe(201);
      expect(respuesta.body).toEqual({ id: 'sug-1' });
      expect(serviciosMock.crearSugerencia).toHaveBeenCalledWith({
        usuarioId: 'user-1',
        tipo,
        texto: 'Agreguen filtros',
      });
    }
  );

  it('acepta exactamente 2000 caracteres', async () => {
    serviciosMock.crearSugerencia.mockResolvedValue({ id: 'sug-1' });
    const respuesta = await request(crearApp())
      .post('/sugerencias')
      .set(...auth)
      .send({ tipo: 'sugerencia', texto: 'a'.repeat(2000) });
    expect(respuesta.status).toBe(201);
  });

  it.each([
    ['texto vacío', { tipo: 'bug', texto: '' }],
    ['texto solo con espacios', { tipo: 'bug', texto: '   ' }],
    ['texto ausente', { tipo: 'bug' }],
    ['texto no string', { tipo: 'bug', texto: 42 }],
    ['texto de 2001 caracteres', { tipo: 'bug', texto: 'a'.repeat(2001) }],
    ['tipo inválido', { tipo: 'otro', texto: 'hola' }],
    ['tipo ausente', { texto: 'hola' }],
  ])('responde 400 de marca si %s', async (_caso, cuerpo) => {
    const respuesta = await request(crearApp()).post('/sugerencias').set(...auth).send(cuerpo);
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.error).toBeTruthy();
    expect(serviciosMock.crearSugerencia).not.toHaveBeenCalled();
  });

  it('con el switch apagado responde 404 de marca y no inserta nada', async () => {
    serviciosMock.sugerenciasActivas.mockResolvedValue(false);
    const respuesta = await request(crearApp()).post('/sugerencias').set(...auth).send(cuerpoValido);
    expect(respuesta.status).toBe(404);
    expect(respuesta.body.error).toBeTruthy();
    expect(serviciosMock.crearSugerencia).not.toHaveBeenCalled();
  });

  it('responde 500 si no puede leer el switch, sin insertar', async () => {
    serviciosMock.sugerenciasActivas.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp()).post('/sugerencias').set(...auth).send(cuerpoValido);
    expect(respuesta.status).toBe(500);
    expect(serviciosMock.crearSugerencia).not.toHaveBeenCalled();
  });

  it('responde 500 con error en formato AD-7 si el insert falla', async () => {
    serviciosMock.crearSugerencia.mockRejectedValue(new Error('boom'));
    const respuesta = await request(crearApp()).post('/sugerencias').set(...auth).send(cuerpoValido);
    expect(respuesta.status).toBe(500);
    expect(respuesta.body).toHaveProperty('error');
  });

  it('no existe endpoint de lectura: GET /sugerencias responde 404', async () => {
    const respuesta = await request(crearApp()).get('/sugerencias').set(...auth);
    expect(respuesta.status).toBe(404);
  });
});
