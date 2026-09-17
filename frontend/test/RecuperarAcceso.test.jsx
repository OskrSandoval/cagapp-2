import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/auth/supabaseClient', () => ({
  supabase: {
    auth: {
      resetPasswordForEmail: vi.fn(),
    },
  },
}));

const { supabase } = await import('../src/auth/supabaseClient');
const { default: RecuperarAcceso } = await import('../src/paginas/RecuperarAcceso.jsx');

// Story 1.3 AC1: un correo válido dispara resetPasswordForEmail y la UI
// confirma en tono de marca sin revelar si la cuenta existe. Errores de
// validación y de red/servidor siguen el mismo patrón que Login.jsx.
describe('RecuperarAcceso', () => {
  beforeEach(() => {
    supabase.auth.resetPasswordForEmail.mockReset();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('correo válido: llama a resetPasswordForEmail con redirectTo y confirma envío sin revelar si la cuenta existe', async () => {
    const usuario = userEvent.setup();
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    render(<RecuperarAcceso onVolver={vi.fn()} />);
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'skr@correo.com');
    await usuario.click(screen.getByRole('button', { name: /mandar instrucciones/i }));

    await waitFor(() =>
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('skr@correo.com', {
        redirectTo: window.location.origin,
      })
    );

    expect(await screen.findByText(/si ese correo tiene cuenta en cagapp/i)).toBeInTheDocument();
    // No debe haber ningún indicio de si la cuenta existe o no en el copy.
    expect(screen.queryByText(/no encontramos/i)).not.toBeInTheDocument();
  });

  it('recorta espacios al inicio/final del correo antes de llamar a resetPasswordForEmail', async () => {
    const usuario = userEvent.setup();
    supabase.auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null });

    render(<RecuperarAcceso onVolver={vi.fn()} />);
    await usuario.type(screen.getByLabelText(/correo electrónico/i), '  skr@correo.com  ');
    await usuario.click(screen.getByRole('button', { name: /mandar instrucciones/i }));

    await waitFor(() =>
      expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('skr@correo.com', {
        redirectTo: window.location.origin,
      })
    );
  });

  it('correo vacío: error inline y foco al campo, sin llamar a resetPasswordForEmail', async () => {
    const usuario = userEvent.setup();

    render(<RecuperarAcceso onVolver={vi.fn()} />);
    await usuario.click(screen.getByRole('button', { name: /mandar instrucciones/i }));

    expect(await screen.findByText(/escribe tu correo/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/correo electrónico/i)).toHaveFocus();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('correo con formato inválido: error inline y no llama a resetPasswordForEmail', async () => {
    const usuario = userEvent.setup();

    render(<RecuperarAcceso onVolver={vi.fn()} />);
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'no-es-un-correo');
    await usuario.click(screen.getByRole('button', { name: /mandar instrucciones/i }));

    expect(await screen.findByText(/no se ve completo/i)).toBeInTheDocument();
    expect(supabase.auth.resetPasswordForEmail).not.toHaveBeenCalled();
  });

  it('falla de red/servidor: muestra mensaje de fallback en tono de marca y no deja la UI colgada', async () => {
    const usuario = userEvent.setup();
    supabase.auth.resetPasswordForEmail.mockRejectedValue(new Error('network error'));

    render(<RecuperarAcceso onVolver={vi.fn()} />);
    await usuario.type(screen.getByLabelText(/correo electrónico/i), 'skr@correo.com');
    await usuario.click(screen.getByRole('button', { name: /mandar instrucciones/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/algo salió mal/i);
    expect(screen.getByRole('button', { name: /mandar instrucciones/i })).not.toBeDisabled();
  });

  it('el botón de volver regresa al login', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();

    render(<RecuperarAcceso onVolver={onVolver} />);
    await usuario.click(screen.getByRole('button', { name: /volver a iniciar sesión/i }));

    expect(onVolver).toHaveBeenCalled();
  });
});
