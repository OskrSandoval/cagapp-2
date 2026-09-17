import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      updateUser: vi.fn(),
    },
  },
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { default: RestablecerContrasena } = await import('../src/paginas/RestablecerContrasena.jsx');

// Story 1.3 AC3: una nueva contraseña válida actualiza la cuenta vía
// updateUser y avisa que terminó (App.jsx retoma el flujo normal). Errores
// de validación, contraseña débil y fallas de red siguen el mismo patrón
// que el resto de las pantallas de auth.
describe('RestablecerContrasena', () => {
  beforeEach(() => {
    supabase.auth.updateUser.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('contraseña válida: llama a updateUser y notifica que terminó', async () => {
    const usuario = userEvent.setup();
    supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    const onCompletado = vi.fn();

    render(<RestablecerContrasena onCompletado={onCompletado} />);
    await usuario.type(screen.getByLabelText(/nueva contraseña/i), 'unaClaveNueva123');
    await usuario.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    await waitFor(() => expect(onCompletado).toHaveBeenCalled());
    expect(supabase.auth.updateUser).toHaveBeenCalledWith({ password: 'unaClaveNueva123' });
  });

  it('contraseña vacía: error inline y foco al campo, sin llamar a updateUser', async () => {
    const usuario = userEvent.setup();

    render(<RestablecerContrasena onCompletado={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(await screen.findByText(/escribe tu nueva contraseña/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/nueva contraseña/i)).toHaveFocus();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('contraseña débil (< mínimo): error inline vía mapearErrorAuth y no llama a updateUser', async () => {
    const usuario = userEvent.setup();

    render(<RestablecerContrasena onCompletado={vi.fn()} />);
    await usuario.type(screen.getByLabelText(/nueva contraseña/i), '123');
    await usuario.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(await screen.findByText(/está muy floja/i)).toBeInTheDocument();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('sesión de recuperación expirada: muestra el mensaje de marca correspondiente', async () => {
    const usuario = userEvent.setup();
    supabase.auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: 'Auth session missing!' },
    });
    const onCompletado = vi.fn();

    render(<RestablecerContrasena onCompletado={onCompletado} />);
    await usuario.type(screen.getByLabelText(/nueva contraseña/i), 'unaClaveNueva123');
    await usuario.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/sesión de recuperación ya venció/i);
    expect(onCompletado).not.toHaveBeenCalled();
  });

  it('falla de red/servidor: muestra mensaje de fallback y no deja la UI colgada', async () => {
    const usuario = userEvent.setup();
    supabase.auth.updateUser.mockRejectedValue(new Error('network error'));

    render(<RestablecerContrasena onCompletado={vi.fn()} />);
    await usuario.type(screen.getByLabelText(/nueva contraseña/i), 'unaClaveNueva123');
    await usuario.click(screen.getByRole('button', { name: /guardar contraseña/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/algo salió mal/i);
    expect(screen.getByRole('button', { name: /guardar contraseña/i })).not.toBeDisabled();
  });

  it('cancelar regresa al flujo normal sin llamar a updateUser', async () => {
    const usuario = userEvent.setup();
    const onCompletado = vi.fn();

    render(<RestablecerContrasena onCompletado={onCompletado} />);
    await usuario.click(screen.getByRole('button', { name: /cancelar y volver/i }));

    expect(onCompletado).toHaveBeenCalled();
    expect(supabase.auth.updateUser).not.toHaveBeenCalled();
  });
});
