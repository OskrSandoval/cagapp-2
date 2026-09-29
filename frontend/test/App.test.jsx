import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn(),
      onAuthStateChange: vi.fn(),
      signOut: vi.fn(),
    },
  },
}));

vi.mock('../src/api/perfilesApi', () => ({
  obtenerMiPerfil: vi.fn(),
}));

// Mapa usa Leaflet (necesita layout real); aquí solo importa que App lo monte.
vi.mock('../src/paginas/Mapa', () => ({
  default: ({ onCerrarSesion }) => (
    <div>
      <h1>Mapa de prueba</h1>
      <button type="button" onClick={onCerrarSesion}>
        Cerrar sesión
      </button>
    </div>
  ),
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { obtenerMiPerfil } = await import('../src/api/perfilesApi.js');
const { default: App } = await import('../src/App.jsx');

const SESION_DE_PRUEBA = { access_token: 'token-de-prueba' };
const PERFIL_DE_PRUEBA = { id: 'user-1', nombre_para_mostrar: 'skr', autorizado: true };

// Story 1.2 AC: cold-open sin sesión siempre redirige a Login/Registro antes
// de cualquier otra pantalla; una sesión persistida (ya resuelta por
// getSession) salta directo a la app; cerrar sesión regresa a Login.
describe('App — puerta de entrada obligatoria', () => {
  let capturarCambioDeAuth;

  beforeEach(() => {
    capturarCambioDeAuth = undefined;
    supabase.auth.onAuthStateChange.mockImplementation((callback) => {
      capturarCambioDeAuth = callback;
      return { data: { subscription: { unsubscribe: vi.fn() } } };
    });
    supabase.auth.signOut.mockResolvedValue({ error: null });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin sesión (cold-open no autenticado) muestra Login, nunca la app', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);

    expect(await screen.findByRole('tab', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /mapa de prueba/i })).not.toBeInTheDocument();
  });

  it('con una sesión ya persistida (getSession la resuelve sola) entra directo, sin pedir login de nuevo', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    obtenerMiPerfil.mockResolvedValue(PERFIL_DE_PRUEBA);

    render(<App />);

    // Mientras `getSession()` sigue resolviendo (el mismo tick), la app no debe
    // mostrar Login ni por un instante — de lo contrario habría un parpadeo a
    // Login antes de confirmar la sesión persistida, justo lo que esta AC prohíbe.
    expect(screen.queryByRole('tab', { name: /iniciar sesión/i })).not.toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: /mapa de prueba/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it('cerrar sesión regresa a Login — la próxima vez hay que autenticarse de nuevo', async () => {
    const usuario = userEvent.setup();
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    obtenerMiPerfil.mockResolvedValue(PERFIL_DE_PRUEBA);

    render(<App />);
    await screen.findByRole('heading', { name: /mapa de prueba/i });

    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());

    // El signOut real dispara onAuthStateChange con sesión null — lo simulamos
    // porque el mock de supabase no ejecuta esa mecánica interna por sí solo.
    capturarCambioDeAuth('SIGNED_OUT', null);

    expect(await screen.findByRole('tab', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /mapa de prueba/i })).not.toBeInTheDocument();
  });

  // Story 1.3 AC: el usuario que llega desde el link de recuperación ve
  // "Restablecer contraseña" antes que cualquier otra pantalla.
  it('detecta PASSWORD_RECOVERY (link del correo) y muestra Restablecer contraseña antes que Login', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: null } });

    render(<App />);
    await screen.findByRole('tab', { name: /iniciar sesión/i });

    capturarCambioDeAuth('PASSWORD_RECOVERY', SESION_DE_PRUEBA);

    expect(await screen.findByRole('heading', { name: /restablecer contraseña/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it('PASSWORD_RECOVERY tiene prioridad incluso si ya hay una sesión persistida', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    obtenerMiPerfil.mockResolvedValue(PERFIL_DE_PRUEBA);

    render(<App />);

    capturarCambioDeAuth('PASSWORD_RECOVERY', SESION_DE_PRUEBA);

    expect(await screen.findByRole('heading', { name: /restablecer contraseña/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /mapa de prueba/i })).not.toBeInTheDocument();
  });

  // Gate "friends and family": ver spec-acceso-friends-and-family.md
  it('perfil con autorizado:false muestra EnEspera, nunca el Mapa', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    obtenerMiPerfil.mockResolvedValue({ ...PERFIL_DE_PRUEBA, autorizado: false });

    render(<App />);

    expect(await screen.findByRole('status')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /mapa de prueba/i })).not.toBeInTheDocument();
  });

  // Fix de la revisión: un perfil sin el campo `autorizado` (cuentas creadas
  // antes de correr la migración) debe comportarse como autorizado — nunca
  // `!perfil.autorizado`, que trataría `undefined` como no autorizado.
  it('perfil con autorizado:undefined entra al mapa normal, igual que autorizado:true', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    const { autorizado: _autorizado, ...perfilSinCampo } = PERFIL_DE_PRUEBA;
    obtenerMiPerfil.mockResolvedValue(perfilSinCampo);

    render(<App />);

    expect(await screen.findByRole('heading', { name: /mapa de prueba/i })).toBeInTheDocument();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });

  it('a los 30s reales dentro de EnEspera se invoca supabase.auth.signOut()', async () => {
    vi.useFakeTimers();
    try {
      supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
      obtenerMiPerfil.mockResolvedValue({ ...PERFIL_DE_PRUEBA, autorizado: false });

      render(<App />);

      // Avanza 0ms para vaciar la cadena de promesas (getSession → sesión →
      // obtenerMiPerfil → perfil) sin que un timer fake bloquee el polling
      // habitual de waitFor/findBy.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByRole('status')).toBeInTheDocument();

      await act(async () => {
        await vi.advanceTimersByTimeAsync(30000);
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();

      // El signOut real dispara onAuthStateChange con sesión null — lo simulamos
      // porque el mock de supabase no ejecuta esa mecánica interna por sí solo.
      await act(async () => {
        capturarCambioDeAuth('SIGNED_OUT', null);
      });

      expect(screen.getByRole('tab', { name: /iniciar sesión/i })).toBeInTheDocument();
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it('el temporizador de 30s de EnEspera sobrevive a un re-render de App (no se reinicia)', async () => {
    vi.useFakeTimers();
    try {
      supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
      obtenerMiPerfil.mockResolvedValue({ ...PERFIL_DE_PRUEBA, autorizado: false });

      render(<App />);

      await act(async () => {
        await vi.advanceTimersByTimeAsync(0);
      });

      expect(screen.getByRole('status')).toBeInTheDocument();

      // Avanza casi hasta la marca de 30s...
      await act(async () => {
        await vi.advanceTimersByTimeAsync(20000);
      });

      // ...y fuerza un re-render de App a mitad de camino. Usamos una nueva
      // referencia de sesión (mismo contenido) porque React ignora
      // setState(mismaReferencia) sin volver a renderizar — necesitamos que
      // App sí se re-renderice para poner a prueba la memoización. Si
      // `manejarTiempoAgotado` no estuviera memoizado con `useCallback([])`,
      // este re-render reiniciaría el `useEffect` de EnEspera y su temporizador.
      await act(async () => {
        capturarCambioDeAuth('TOKEN_REFRESHED', { ...SESION_DE_PRUEBA });
      });

      expect(supabase.auth.signOut).not.toHaveBeenCalled();

      // Completa los ~10s restantes hasta la marca original de 30s.
      await act(async () => {
        await vi.advanceTimersByTimeAsync(10000);
      });

      expect(supabase.auth.signOut).toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
