import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/api/banosApi', () => ({ crearBano: vi.fn() }));

const { crearBano } = await import('../src/api/banosApi');
const { default: CrearBano } = await import('../src/paginas/CrearBano.jsx');

const UBICACION = { lat: 19.4326, lng: -99.1332 };

const BANO_LEJOS = { id: '1', nombre: 'Lejos', tipo_lugar: 'Café', zona: 'Polanco', distancia_metros: 5000 };
const BANO_CERCA = { id: '2', nombre: 'Cerca', tipo_lugar: 'Plaza', zona: 'Centro', distancia_metros: 800 };

describe('CrearBano', () => {
  beforeEach(() => {
    crearBano.mockReset();
  });

  it('sin ubicación conocida muestra el mensaje bloqueante y no llega al formulario', async () => {
    const usuario = userEvent.setup();
    const onReintentarUbicacion = vi.fn();
    render(
      <CrearBano ubicacion={null} banos={[]} onVolver={() => {}} onReintentarUbicacion={onReintentarUbicacion} />
    );

    expect(screen.getByText(/sin tu ubicación/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /activar ubicación/i }));
    expect(onReintentarUbicacion).toHaveBeenCalledTimes(1);
  });

  it('tocar Volver en el bloqueo de ubicación llama a onVolver', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<CrearBano ubicacion={null} banos={[]} onVolver={onVolver} onReintentarUbicacion={() => {}} />);

    await usuario.click(screen.getByRole('button', { name: /volver/i }));
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('con un baño existente a <=1.5km muestra ese baño (Detalle) y no ofrece crear de todos modos', () => {
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_LEJOS, BANO_CERCA]} onVolver={() => {}} />);

    expect(screen.getByRole('dialog', { name: /detalle de cerca/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/crear de todos modos/i)).not.toBeInTheDocument();
  });

  it('un baño a exactamente 1500m cuenta como duplicado (límite inclusivo <=)', () => {
    const BANO_AL_LIMITE = { id: '3', nombre: 'Al límite', tipo_lugar: 'Parque', zona: 'Doctores', distancia_metros: 1500 };
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_AL_LIMITE]} onVolver={() => {}} />);

    expect(screen.getByRole('dialog', { name: /detalle de al límite/i })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it('sin ningún baño a <=1.5km habilita el formulario', () => {
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_LEJOS]} onVolver={() => {}} />);

    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zona o colonia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de lugar/i)).toBeInTheDocument();
  });

  it('sin baños cargados (banos vacío o null) también habilita el formulario', () => {
    render(<CrearBano ubicacion={UBICACION} banos={null} onVolver={() => {}} />);
    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
  });

  it('envío con un campo vacío muestra error en línea, enfoca el primer campo inválido y no envía', async () => {
    const usuario = userEvent.setup();
    render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} />);

    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    expect(screen.getByText(/¿cómo se llama el baño\?/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre$/i)).toHaveFocus();
    expect(crearBano).not.toHaveBeenCalled();
  });

  it('envío con nombre pero sin zona enfoca el campo de zona', async () => {
    const usuario = userEvent.setup();
    render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} />);

    await usuario.type(screen.getByLabelText(/^nombre$/i), 'Café Nuevo');
    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    expect(screen.getByLabelText(/zona o colonia/i)).toHaveFocus();
    expect(crearBano).not.toHaveBeenCalled();
  });

  it('envío con datos válidos crea el baño con la ubicación del dispositivo y llama a onCreado', async () => {
    const usuario = userEvent.setup();
    const onCreado = vi.fn();
    crearBano.mockResolvedValue({ id: 'nuevo-1', nombre: 'Café Nuevo' });

    render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} onCreado={onCreado} />);

    await usuario.type(screen.getByLabelText(/^nombre$/i), 'Café Nuevo');
    await usuario.type(screen.getByLabelText(/zona o colonia/i), 'Roma Norte');
    await usuario.type(screen.getByLabelText(/tipo de lugar/i), 'Cafetería');
    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    await vi.waitFor(() => expect(onCreado).toHaveBeenCalledWith({ id: 'nuevo-1', nombre: 'Café Nuevo' }));
    expect(crearBano).toHaveBeenCalledWith({
      nombre: 'Café Nuevo',
      zona: 'Roma Norte',
      tipoLugar: 'Cafetería',
      lat: UBICACION.lat,
      lng: UBICACION.lng,
    });
  });

  it('si POST /banos falla muestra un mensaje de marca y no pierde lo ya escrito', async () => {
    const usuario = userEvent.setup();
    crearBano.mockRejectedValue(new Error('No pudimos crear el baño 😬 — intenta de nuevo.'));

    render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} />);

    await usuario.type(screen.getByLabelText(/^nombre$/i), 'Café Nuevo');
    await usuario.type(screen.getByLabelText(/zona o colonia/i), 'Roma Norte');
    await usuario.type(screen.getByLabelText(/tipo de lugar/i), 'Cafetería');
    await usuario.click(screen.getByRole('button', { name: /agregar baño/i }));

    expect(await screen.findByRole('alert')).toHaveTextContent(/no pudimos crear el baño/i);
    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Café Nuevo');
  });
});
