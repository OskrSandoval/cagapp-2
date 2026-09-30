// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
    },
  },
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { obtenerTokenActual, leerCuerpoError } = await import('../src/api/cliente.js');

describe('cliente de API', () => {
  beforeEach(() => {
    supabase.auth.getSession.mockReset();
  });

  it('API_URL usa VITE_API_URL cuando está definida', async () => {
    vi.stubEnv('VITE_API_URL', 'https://api.ejemplo.test');
    vi.resetModules();
    const { API_URL: conVariable } = await import('../src/api/cliente.js');
    expect(conVariable).toBe('https://api.ejemplo.test');
    vi.unstubAllEnvs();
  });

  it('API_URL cae al backend local si VITE_API_URL está vacía', async () => {
    vi.stubEnv('VITE_API_URL', '');
    vi.resetModules();
    const { API_URL: sinVariable } = await import('../src/api/cliente.js');
    expect(sinVariable).toBe('http://localhost:3001');
    vi.unstubAllEnvs();
  });

  it('obtenerTokenActual devuelve el access_token de la sesión', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: { access_token: 'tok-1' } } });
    await expect(obtenerTokenActual()).resolves.toBe('tok-1');
  });

  it('obtenerTokenActual lanza el mensaje de marca si no hay sesión', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });
    await expect(obtenerTokenActual()).rejects.toThrow('No hay sesión activa — vuelve a iniciar sesión 🔐');
  });

  it('leerCuerpoError devuelve el campo error del JSON', async () => {
    const respuesta = new Response(JSON.stringify({ error: 'Algo tronó' }), { status: 500 });
    await expect(leerCuerpoError(respuesta)).resolves.toBe('Algo tronó');
  });

  it('leerCuerpoError devuelve null si el cuerpo no es JSON', async () => {
    const respuesta = new Response('<html>', { status: 502 });
    await expect(leerCuerpoError(respuesta)).resolves.toBeNull();
  });
});
