import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
    },
  },
}));

vi.mock('../src/api/perfilesApi', () => ({
  crearPerfil: vi.fn(),
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { default: Login } = await import('../src/paginas/Login.jsx');

// Story 1.2 AC: credenciales correctas autentican; credenciales incorrectas
// muestran un mensaje de error claro con tono de marca (mapearErrorAuth), y
// nunca dejan pasar el error crudo de Supabase.
describe('Login — pestaña Iniciar sesión', () => {
  beforeEach(() => {
    supabase.auth.signInWithPassword.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  async function llenarYEnviar(usuario) {
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'skr@correo.com');
    await usuario.type(screen.getByLabelText(/contraseña/i), 'unaClaveCualquiera');
    await usuario.click(screen.getByRole('button', { name: /entrar y encontrar baño/i }));
  }

  it('credenciales correctas: llama a signInWithPassword y notifica autenticación', async () => {
    const usuario = userEvent.setup();
    supabase.auth.signInWithPassword.mockResolvedValue({ data: { session: {} }, error: null });
    const onAutenticado = vi.fn();

    render(<Login onAutenticado={onAutenticado} />);
    await llenarYEnviar(usuario);

    await waitFor(() => expect(onAutenticado).toHaveBeenCalled());
    expect(supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: 'skr@correo.com',
      password: 'unaClaveCualquiera',
    });
  });

  it('credenciales incorrectas: muestra un mensaje claro y no notifica autenticación', async () => {
    const usuario = userEvent.setup();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });
    const onAutenticado = vi.fn();

    render(<Login onAutenticado={onAutenticado} />);
    await llenarYEnviar(usuario);

    expect(await screen.findByRole('alert')).toHaveTextContent(/correo o contraseña incorrectos/i);
    expect(onAutenticado).not.toHaveBeenCalled();
  });

  // Retro Épica 1, action item #1: una promesa rechazada (falla de red, no
  // solo un `{error}` de Supabase) debe mostrar el fallback de marca en vez
  // de dejar al usuario sin mensaje.
  it('falla de red (promesa rechazada): muestra el mensaje de marca, no notifica autenticación y libera el botón', async () => {
    const usuario = userEvent.setup();
    supabase.auth.signInWithPassword.mockRejectedValue(new TypeError('Failed to fetch'));
    const onAutenticado = vi.fn();

    render(<Login onAutenticado={onAutenticado} />);
    await llenarYEnviar(usuario);

    expect(await screen.findByRole('alert')).toHaveTextContent(/algo salió mal/i);
    expect(onAutenticado).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: /entrar y encontrar baño/i })).toBeEnabled();
  });

  // Story 1.3: el link "olvide" navega a RecuperarAcceso (sin router, por
  // estado interno) y "Volver a iniciar sesión" regresa al formulario.
  it('el link "¿Se te olvidó?" navega a Recuperar acceso y "Volver" regresa al login', async () => {
    const usuario = userEvent.setup();

    render(<Login onAutenticado={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: /se te olvidó/i }));

    expect(await screen.findByRole('heading', { name: /recuperar acceso/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /iniciar sesión/i })).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /volver a iniciar sesión/i }));

    expect(await screen.findByRole('tab', { name: /iniciar sesión/i })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /recuperar acceso/i })).not.toBeInTheDocument();
  });
});
