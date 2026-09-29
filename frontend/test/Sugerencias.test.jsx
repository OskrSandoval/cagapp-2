import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/api/sugerenciasApi', () => ({ enviarSugerencia: vi.fn() }));

const { enviarSugerencia } = await import('../src/api/sugerenciasApi');
const { default: Sugerencias } = await import('../src/paginas/Sugerencias.jsx');

describe('Sugerencias', () => {
  beforeEach(() => {
    enviarSugerencia.mockReset();
  });

  it('abre con foco en Volver, dos radios accesibles de tipo y un campo de texto con label visible', () => {
    render(<Sugerencias onVolver={() => {}} />);

    expect(screen.getByRole('dialog', { name: /^sugerencias$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^volver$/i })).toHaveFocus();
    expect(screen.getByRole('group', { name: /qué nos cuentas/i })).toBeInTheDocument();
    expect(screen.getAllByRole('radio')).toHaveLength(2);
    expect(screen.getByRole('radio', { name: /tronó/i })).toBeInTheDocument();
    expect(screen.getByRole('radio', { name: /idea/i })).toBeInTheDocument();
    const campo = screen.getByLabelText(/tu mensaje/i);
    expect(campo.tagName).toBe('TEXTAREA');
    expect(campo).toHaveAttribute('maxLength', '2000');
  });

  it('Volver llama a onVolver', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<Sugerencias onVolver={onVolver} />);

    await usuario.click(screen.getByRole('button', { name: /^volver$/i }));
    expect(onVolver).toHaveBeenCalled();
  });

  it('envío válido manda tipo y texto recortado y muestra la confirmación de marca con botón para volver', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    enviarSugerencia.mockResolvedValue({ id: 'sug-1' });
    render(<Sugerencias onVolver={onVolver} />);

    await usuario.click(screen.getByRole('radio', { name: /tronó/i }));
    await usuario.type(screen.getByLabelText(/tu mensaje/i), '  El mapa se congela  ');
    await usuario.click(screen.getByRole('button', { name: /enviar/i }));

    expect(enviarSugerencia).toHaveBeenCalledWith({ tipo: 'bug', texto: 'El mapa se congela' });
    expect(await screen.findByText('¡Recibido! Lo leemos con lupa 🔍')).toBeInTheDocument();

    const botones = screen.getAllByRole('button', { name: /^volver$/i });
    await usuario.click(botones[botones.length - 1]);
    expect(onVolver).toHaveBeenCalled();
  });

  it('con tipo sugerencia manda tipo "sugerencia"', async () => {
    const usuario = userEvent.setup();
    enviarSugerencia.mockResolvedValue({ id: 'sug-1' });
    render(<Sugerencias onVolver={() => {}} />);

    await usuario.click(screen.getByRole('radio', { name: /idea/i }));
    await usuario.type(screen.getByLabelText(/tu mensaje/i), 'Filtros por tipo');
    await usuario.click(screen.getByRole('button', { name: /enviar/i }));

    expect(enviarSugerencia).toHaveBeenCalledWith({ tipo: 'sugerencia', texto: 'Filtros por tipo' });
  });

  it.each([
    ['vacío', ''],
    ['solo espacios', '   '],
  ])('texto %s muestra error en línea, mueve el foco al campo y no envía', async (_caso, texto) => {
    const usuario = userEvent.setup();
    render(<Sugerencias onVolver={() => {}} />);

    if (texto) await usuario.type(screen.getByLabelText(/tu mensaje/i), texto);
    await usuario.click(screen.getByRole('button', { name: /enviar/i }));

    const campo = screen.getByLabelText(/tu mensaje/i);
    expect(screen.getByText(/no puede ir vacío/i)).toHaveClass('mensaje-error');
    expect(campo).toHaveFocus();
    expect(campo).toHaveAttribute('aria-invalid', 'true');
    expect(enviarSugerencia).not.toHaveBeenCalled();
  });

  it('si el envío falla muestra error de marca y conserva texto y tipo para reintentar', async () => {
    const usuario = userEvent.setup();
    enviarSugerencia.mockRejectedValueOnce(new Error('No pudimos mandar tu mensaje 😬 — intenta de nuevo.'));
    enviarSugerencia.mockResolvedValueOnce({ id: 'sug-1' });
    render(<Sugerencias onVolver={() => {}} />);

    await usuario.click(screen.getByRole('radio', { name: /tronó/i }));
    await usuario.type(screen.getByLabelText(/tu mensaje/i), 'Se cae al calificar');
    await usuario.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos mandar tu mensaje/i);
    expect(screen.getByLabelText(/tu mensaje/i)).toHaveValue('Se cae al calificar');
    expect(screen.getByRole('radio', { name: /tronó/i })).toBeChecked();

    await usuario.click(screen.getByRole('button', { name: /enviar/i }));
    expect(enviarSugerencia).toHaveBeenLastCalledWith({ tipo: 'bug', texto: 'Se cae al calificar' });
    expect(await screen.findByText('¡Recibido! Lo leemos con lupa 🔍')).toBeInTheDocument();
  });

  it('si el buzón cerró (404) muestra el mensaje del backend sin formulario ni reintento y avisa con onBuzonCerrado', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    const onBuzonCerrado = vi.fn();
    const error = Object.assign(new Error('El buzón de sugerencias ya cerró 📪'), { status: 404 });
    enviarSugerencia.mockRejectedValue(error);
    render(<Sugerencias onVolver={onVolver} onBuzonCerrado={onBuzonCerrado} />);

    await usuario.type(screen.getByLabelText(/tu mensaje/i), 'Hola');
    await usuario.click(screen.getByRole('button', { name: /enviar/i }));

    expect(await screen.findByText('El buzón de sugerencias ya cerró 📪')).toBeInTheDocument();
    expect(onBuzonCerrado).toHaveBeenCalledTimes(1);
    expect(screen.queryByLabelText(/tu mensaje/i)).not.toBeInTheDocument();
    expect(screen.queryAllByRole('radio')).toHaveLength(0);
    expect(screen.queryByRole('button', { name: /enviar/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    const botones = screen.getAllByRole('button', { name: /^volver$/i });
    await usuario.click(botones[botones.length - 1]);
    expect(onVolver).toHaveBeenCalled();
  });
});
