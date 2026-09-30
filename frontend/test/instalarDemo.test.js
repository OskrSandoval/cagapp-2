import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: { auth: {} },
}));

const API_URL = 'http://demo.local';

describe('instalarDemo', () => {
  let fetchOriginal;
  let fetchPrevio;
  let tituloPrevio;
  let authPrevio;
  let supabase;

  beforeEach(async () => {
    vi.resetModules();
    vi.stubEnv('VITE_API_URL', API_URL);
    ({ supabase } = await import('../src/auth/supabaseClient'));
    authPrevio = { ...supabase.auth };
    fetchPrevio = window.fetch;
    fetchOriginal = vi.fn(async () => new Response('tile', { status: 200 }));
    window.fetch = fetchOriginal;
    tituloPrevio = document.title;
    document.title = 'CagApp';
    vi.spyOn(console, 'info').mockImplementation(() => {});
  });

  afterEach(() => {
    window.fetch = fetchPrevio;
    document.title = tituloPrevio;
    delete navigator.geolocation; // quita la propiedad propia; vuelve la del prototipo (si hay)
    delete window.cagappDemo;
    for (const llave of Object.keys(supabase.auth)) delete supabase.auth[llave];
    Object.assign(supabase.auth, authPrevio);
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  async function instalar() {
    const { instalarDemo } = await import('../src/demo/instalarDemo.js');
    instalarDemo();
  }

  it('lanza un error claro si falta VITE_API_URL', async () => {
    vi.stubEnv('VITE_API_URL', '');
    const { instalarDemo } = await import('../src/demo/instalarDemo.js');
    expect(() => instalarDemo()).toThrow(/VITE_API_URL/);
    expect(window.fetch).toBe(fetchOriginal);
    expect(window.cagappDemo).toBeUndefined();
  });

  it('sesión falsa, GPS falso, título y window.cagappDemo', async () => {
    await instalar();

    const { data } = await supabase.auth.getSession();
    expect(data.session.access_token).toBe('token-demo');
    expect(data.session.user.id).toBe('de000000-0000-4000-8000-000000000001');
    expect(await supabase.auth.signOut()).toEqual({ error: null });
    expect(supabase.auth.onAuthStateChange().data.subscription.unsubscribe).toEqual(expect.any(Function));

    expect(typeof navigator.geolocation.watchPosition).toBe('function');
    const posicion = await new Promise((resolver) => navigator.geolocation.getCurrentPosition(resolver));
    expect(posicion.coords).toEqual(expect.objectContaining({ latitude: 19.4195, longitude: -99.162 }));
    window.cagappDemo.moverA(19.43, -99.15);
    expect(window.cagappDemo.estado().gps).toEqual({ lat: 19.43, lng: -99.15, accuracy: 15 });

    expect(document.title).toBe('[DEMO] CagApp');
  });

  it('GET y POST reales de banosApi pasan por la API demo, no por el fetch original', async () => {
    await instalar();
    const { obtenerBanosCercanos, crearBano } = await import('../src/api/banosApi.js');

    const banos = await obtenerBanosCercanos({ lat: 19.4195, lng: -99.162 });
    expect(banos).toHaveLength(6);
    expect(banos[0]).toEqual(expect.objectContaining({ nombre: 'Café La Plaza', distancia_metros: expect.any(Number) }));

    const nuevo = await crearBano({ nombre: 'Oxxo', zona: 'Roma Norte', tipoLugar: 'Tienda', lat: 19.4195, lng: -99.162 });
    expect(nuevo).toEqual(expect.objectContaining({ nombre: 'Oxxo', tipo_lugar: 'Tienda' }));
    expect(window.cagappDemo.estado().banos).toHaveLength(7);

    await expect(crearBano({ nombre: '', zona: 'Roma', tipoLugar: 'X', lat: 1, lng: 1 })).rejects.toThrow(
      '¿Cómo se llama el baño? Escribe un nombre 🚽.'
    );

    expect(fetchOriginal).not.toHaveBeenCalled();
  });

  it('un fetch a una URL que no es de la API va al fetch original', async () => {
    await instalar();
    const url = 'https://tile.openstreetmap.org/13/1839/3644.png';
    const respuesta = await window.fetch(url);
    expect(await respuesta.text()).toBe('tile');
    expect(fetchOriginal).toHaveBeenCalledWith(url, {});
  });
});
