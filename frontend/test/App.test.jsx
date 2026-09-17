import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
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

const { supabase } = await import('../src/auth/supabaseClient');
const { obtenerMiPerfil } = await import('../src/api/perfilesApi.js');
const { default: App } = await import('../src/App.jsx');

const SESION_DE_PRUEBA = { access_token: 'token-de-prueba' };
const PERFIL_DE_PRUEBA = { id: 'user-1', nombre_para_mostrar: 'skr' };

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
    expect(screen.queryByRole('heading', { name: /ya estás dentro/i })).not.toBeInTheDocument();
  });

  it('con una sesión ya persistida (getSession la resuelve sola) entra directo, sin pedir login de nuevo', async () => {
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    obtenerMiPerfil.mockResolvedValue(PERFIL_DE_PRUEBA);

    render(<App />);

    // Mientras `getSession()` sigue resolviendo (el mismo tick), la app no debe
    // mostrar Login ni por un instante — de lo contrario habría un parpadeo a
    // Login antes de confirmar la sesión persistida, justo lo que esta AC prohíbe.
    expect(screen.queryByRole('tab', { name: /iniciar sesión/i })).not.toBeInTheDocument();

    expect(await screen.findByRole('heading', { name: /ya estás dentro/i })).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /iniciar sesión/i })).not.toBeInTheDocument();
  });

  it('cerrar sesión regresa a Login — la próxima vez hay que autenticarse de nuevo', async () => {
    const usuario = userEvent.setup();
    supabase.auth.getSession.mockResolvedValue({ data: { session: SESION_DE_PRUEBA } });
    obtenerMiPerfil.mockResolvedValue(PERFIL_DE_PRUEBA);

    render(<App />);
    await screen.findByRole('heading', { name: /ya estás dentro/i });

    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }));

    await waitFor(() => expect(supabase.auth.signOut).toHaveBeenCalled());

    // El signOut real dispara onAuthStateChange con sesión null — lo simulamos
    // porque el mock de supabase no ejecuta esa mecánica interna por sí solo.
    capturarCambioDeAuth('SIGNED_OUT', null);

    expect(await screen.findByRole('tab', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /ya estás dentro/i })).not.toBeInTheDocument();
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
    expect(screen.queryByRole('heading', { name: /ya estás dentro/i })).not.toBeInTheDocument();
  });
});
