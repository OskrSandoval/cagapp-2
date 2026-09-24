import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/api/perfilesApi', () => ({ obtenerMiActividad: vi.fn() }));

const { obtenerMiActividad } = await import('../src/api/perfilesApi');
const { default: Perfil } = await import('../src/paginas/Perfil.jsx');

const ACTIVIDAD_MIXTA = [
  { 'baño_id': 'bano-1', nombre: 'Café Uno', tipo_lugar: 'Cafetería', zona: 'Centro', estrellas: 5 },
  { 'baño_id': 'bano-2', nombre: 'Parque Dos', tipo_lugar: 'Parque', zona: 'Roma', estrellas: null },
];

describe('Perfil', () => {
  beforeEach(() => {
    obtenerMiActividad.mockReset();
  });

  it('con check-ins y calificaciones muestra cada baño con su calificación vigente', async () => {
    obtenerMiActividad.mockResolvedValue(ACTIVIDAD_MIXTA);

    render(<Perfil onVolver={() => {}} onCerrarSesion={() => {}} />);

    expect(await screen.findByText('Café Uno')).toBeInTheDocument();
    expect(screen.getByText('Cafetería · Centro')).toBeInTheDocument();
    expect(screen.getByText('★★★★★')).toBeInTheDocument();
  });

  it('un baño con check-in pero sin calificar muestra un indicador explícito, nunca vacío', async () => {
    obtenerMiActividad.mockResolvedValue(ACTIVIDAD_MIXTA);

    render(<Perfil onVolver={() => {}} onCerrarSesion={() => {}} />);

    expect(await screen.findByText('Parque Dos')).toBeInTheDocument();
    expect(screen.getByText(/sin calificar todavía/i)).toBeInTheDocument();
  });

  it('usuario nuevo sin actividad ve una invitación chusca, no una lista vacía genérica', async () => {
    obtenerMiActividad.mockResolvedValue([]);

    render(<Perfil onVolver={() => {}} onCerrarSesion={() => {}} />);

    expect(await screen.findByText(/huella/i)).toBeInTheDocument();
    expect(screen.queryByText(/^sin actividad$/i)).not.toBeInTheDocument();
  });

  it('si GET /perfiles/yo/actividad falla, muestra un mensaje de marca con opción de reintentar (no se cuelga)', async () => {
    const usuario = userEvent.setup();
    obtenerMiActividad
      .mockRejectedValueOnce(new Error('No pudimos revisar tu actividad 😬 — intenta de nuevo.'))
      .mockResolvedValueOnce(ACTIVIDAD_MIXTA);

    render(<Perfil onVolver={() => {}} onCerrarSesion={() => {}} />);

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos revisar tu actividad/i);

    await usuario.click(screen.getByRole('button', { name: /reintentar/i }));

    expect(await screen.findByText('Café Uno')).toBeInTheDocument();
  });

  it('nunca navega al Detalle del baño al tocar una fila (Perfil de solo lectura)', async () => {
    obtenerMiActividad.mockResolvedValue(ACTIVIDAD_MIXTA);

    render(<Perfil onVolver={() => {}} onCerrarSesion={() => {}} />);

    await screen.findByText('Café Uno');
    // Las filas de actividad no son botones ni enlaces — son solo texto.
    expect(screen.queryByRole('button', { name: /café uno/i })).not.toBeInTheDocument();
  });

  it('Volver cierra el overlay (lo controla el padre) y Cerrar sesión llama a onCerrarSesion', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    const onCerrarSesion = vi.fn();
    obtenerMiActividad.mockResolvedValue([]);

    render(<Perfil onVolver={onVolver} onCerrarSesion={onCerrarSesion} />);
    await screen.findByRole('status');

    await usuario.click(screen.getByRole('button', { name: /volver/i }));
    expect(onVolver).toHaveBeenCalled();

    await usuario.click(screen.getByRole('button', { name: /cerrar sesión/i }));
    expect(onCerrarSesion).toHaveBeenCalled();
  });
});
