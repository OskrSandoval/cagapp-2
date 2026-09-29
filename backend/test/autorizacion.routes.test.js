import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Gate "friends and family" del lado del servidor (middleware
// verificarAutorizado): se prueba a través de la app real, ruta por ruta,
// para que quitar el middleware de cualquier router rompa un test.

const perfilesMock = vi.hoisted(() => ({
  crearOActualizarPerfil: vi.fn(),
  obtenerPerfilPorId: vi.fn(),
  obtenerActividad: vi.fn(),
}));
const banosMock = vi.hoisted(() => ({
  listarBanos: vi.fn(),
  crearBano: vi.fn(),
}));
const checkinsMock = vi.hoisted(() => ({ crearCheckin: vi.fn() }));
const calificacionesMock = vi.hoisted(() => ({
  calificarBano: vi.fn(),
  obtenerCalificacionesPublicas: vi.fn(),
}));

const sugerenciasMock = vi.hoisted(() => ({
  crearSugerencia: vi.fn(),
  sugerenciasActivas: vi.fn(),
}));

vi.mock('../src/servicios/perfilesService.js', () => perfilesMock);
vi.mock('../src/servicios/banosService.js', () => banosMock);
vi.mock('../src/servicios/checkinsService.js', () => checkinsMock);
vi.mock('../src/servicios/calificacionesService.js', () => calificacionesMock);
vi.mock('../src/servicios/sugerenciasService.js', () => sugerenciasMock);

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

const rutasConGate = [
  { metodo: 'get', ruta: '/banos?lat=19.4326&lng=-99.1332' },
  { metodo: 'post', ruta: '/banos' },
  { metodo: 'post', ruta: '/checkins' },
  { metodo: 'get', ruta: '/calificaciones?bano_id=11111111-1111-1111-1111-111111111111' },
  { metodo: 'post', ruta: '/calificaciones' },
  { metodo: 'get', ruta: '/perfiles/yo/actividad' },
  { metodo: 'get', ruta: '/sugerencias/estado' },
  { metodo: 'post', ruta: '/sugerencias' },
];

function serviciosDeNegocio() {
  return [
    ...Object.values(banosMock),
    ...Object.values(checkinsMock),
    ...Object.values(calificacionesMock),
    ...Object.values(sugerenciasMock),
    perfilesMock.obtenerActividad,
  ];
}

describe('gate "friends and family" en el backend', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe.each(rutasConGate)('$metodo $ruta', ({ metodo, ruta }) => {
    it('responde 403 de marca si el perfil tiene autorizado: false y nunca llega al servicio', async () => {
      perfilesMock.obtenerPerfilPorId.mockResolvedValue({ id: 'user-1', autorizado: false });

      const respuesta = await request(crearApp())[metodo](ruta).set(...auth).send({});

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error).toBeTruthy();
      expect(perfilesMock.obtenerPerfilPorId).toHaveBeenCalledWith('user-1');
      for (const servicio of serviciosDeNegocio()) {
        expect(servicio).not.toHaveBeenCalled();
      }
    });

    it('responde 403 si el usuario todavía no tiene perfil', async () => {
      perfilesMock.obtenerPerfilPorId.mockResolvedValue(null);

      const respuesta = await request(crearApp())[metodo](ruta).set(...auth).send({});

      expect(respuesta.status).toBe(403);
      expect(respuesta.body.error).toBeTruthy();
      expect(perfilesMock.obtenerPerfilPorId).toHaveBeenCalledWith('user-1');
      for (const servicio of serviciosDeNegocio()) {
        expect(servicio).not.toHaveBeenCalled();
      }
    });

    it('responde 500 de marca si no se puede leer el perfil, sin llegar al servicio', async () => {
      perfilesMock.obtenerPerfilPorId.mockRejectedValue(new Error('boom'));

      const respuesta = await request(crearApp())[metodo](ruta).set(...auth).send({});

      expect(respuesta.status).toBe(500);
      expect(respuesta.body.error).toBeTruthy();
      for (const servicio of serviciosDeNegocio()) {
        expect(servicio).not.toHaveBeenCalled();
      }
    });

    it('sin token sigue respondiendo 401 antes de consultar el perfil', async () => {
      const respuesta = await request(crearApp())[metodo](ruta).send({});

      expect(respuesta.status).toBe(401);
      expect(perfilesMock.obtenerPerfilPorId).not.toHaveBeenCalled();
    });
  });

  it('un perfil sin el campo autorizado (migración 005 sin correr) pasa el gate, igual que App.jsx', async () => {
    perfilesMock.obtenerPerfilPorId.mockResolvedValue({ id: 'user-1' });
    perfilesMock.obtenerActividad.mockResolvedValue([]);

    const respuesta = await request(crearApp()).get('/perfiles/yo/actividad').set(...auth);

    expect(respuesta.status).toBe(200);
    expect(perfilesMock.obtenerActividad).toHaveBeenCalledWith('user-1');
  });

  it('GET /perfiles/yo sigue abierto para un usuario no autorizado (el frontend necesita leer autorizado)', async () => {
    perfilesMock.obtenerPerfilPorId.mockResolvedValue({ id: 'user-1', autorizado: false });

    const respuesta = await request(crearApp()).get('/perfiles/yo').set(...auth);

    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual({ id: 'user-1', autorizado: false });
  });

  it('POST /perfiles sigue abierto: el registro es libre y no consulta la autorización', async () => {
    perfilesMock.crearOActualizarPerfil.mockResolvedValue({ id: 'user-1', nombre_para_mostrar: 'Nuevo', autorizado: false });

    const respuesta = await request(crearApp())
      .post('/perfiles')
      .set(...auth)
      .send({ nombre_para_mostrar: 'Nuevo' });

    expect(respuesta.status).toBe(200);
    expect(perfilesMock.obtenerPerfilPorId).not.toHaveBeenCalled();
  });
});
