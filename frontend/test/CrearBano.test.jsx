import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('../src/api/banosApi', () => ({ crearBano: vi.fn() }));

const { crearBano } = await import('../src/api/banosApi');
const { default: CrearBano } = await import('../src/paginas/CrearBano.jsx');

const UBICACION = { lat: 19.4326, lng: -99.1332 };

const BANO_LEJOS = { id: '1', nombre: 'Lejos', tipo_lugar: 'Café', zona: 'Polanco', distancia_metros: 5000 };
const BANO_A_800 = { id: '2', nombre: 'El Jajarro', tipo_lugar: 'Bar', zona: 'Centro', distancia_metros: 800 };
const BANO_A_150 = { id: '3', nombre: 'Fonda Doña Lupe', tipo_lugar: 'Restaurante', zona: 'Centro', distancia_metros: 150 };
const BANO_A_40 = { id: '4', nombre: 'OXXO Esquina', tipo_lugar: 'Tienda', zona: 'Centro', distancia_metros: 40 };

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

  it('lista todos los baños a <=200m ordenados por cercanía, con tipo de lugar y distancia, sin abrir el formulario', () => {
    render(
      <CrearBano ubicacion={UBICACION} banos={[BANO_LEJOS, BANO_A_150, BANO_A_40]} onVolver={() => {}} />
    );

    const filas = within(screen.getByRole('list', { name: /baños cerca de ti/i })).getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent(/oxxo esquina/i);
    expect(filas[0]).toHaveTextContent(/tienda · 40 m/i);
    expect(filas[1]).toHaveTextContent(/fonda doña lupe/i);
    expect(filas[1]).toHaveTextContent(/restaurante · 150 m/i);
    expect(screen.queryByText(/lejos/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
  });

  it('un baño a exactamente 200m aparece en la lista (límite inclusivo <=)', () => {
    const BANO_AL_LIMITE = { id: '5', nombre: 'Al límite', tipo_lugar: 'Parque', zona: 'Doctores', distancia_metros: 200 };
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_AL_LIMITE]} onVolver={() => {}} />);

    expect(screen.getByRole('button', { name: /al límite/i })).toBeInTheDocument();
  });

  it('un baño a más de 200m (aunque esté a <1.5km) no bloquea: pasa directo al formulario con nota', () => {
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_A_800]} onVolver={() => {}} />);

    expect(screen.queryByRole('list', { name: /baños cerca de ti/i })).not.toBeInTheDocument();
    expect(screen.getByText(/no hay baños a la redonda/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
  });

  it('"Ninguno es este, crear nuevo" abre el formulario', async () => {
    const usuario = userEvent.setup();
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_A_40]} onVolver={() => {}} />);

    await usuario.click(screen.getByRole('button', { name: /ninguno es este, crear nuevo/i }));

    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.queryByRole('list', { name: /baños cerca de ti/i })).not.toBeInTheDocument();
  });

  it('tocar un baño de la lista abre su Detalle, y Volver regresa a la lista (no cierra el flujo)', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_A_40, BANO_A_150]} onVolver={onVolver} />);

    await usuario.click(screen.getByRole('button', { name: /fonda doña lupe/i }));
    expect(screen.getByRole('dialog', { name: /detalle de fonda doña lupe/i })).toBeInTheDocument();

    await usuario.click(screen.getByRole('button', { name: /volver/i }));
    expect(onVolver).not.toHaveBeenCalled();
    expect(screen.getByRole('list', { name: /baños cerca de ti/i })).toBeInTheDocument();
  });

  it('Volver desde la lista cierra el flujo', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_A_40]} onVolver={onVolver} />);

    await usuario.click(screen.getByRole('button', { name: /volver/i }));
    expect(onVolver).toHaveBeenCalledTimes(1);
  });

  it('mientras banos no ha cargado (null) muestra "buscando" en vez del formulario o la nota de sin baños', () => {
    render(<CrearBano ubicacion={UBICACION} banos={null} onVolver={() => {}} />);

    expect(screen.getByRole('status')).toHaveTextContent(/buscando baños cerca/i);
    expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/no hay baños a la redonda/i)).not.toBeInTheDocument();
  });

  it('la lista se fija con la primera carga: si banos cambia o falla después, Volver desde Detalle sigue regresando a la misma lista', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<CrearBano ubicacion={UBICACION} banos={[BANO_A_40]} onVolver={() => {}} />);

    await usuario.click(screen.getByRole('button', { name: /oxxo esquina/i }));
    rerender(<CrearBano ubicacion={UBICACION} banos={null} onVolver={() => {}} />);
    await usuario.click(screen.getByRole('button', { name: /volver/i }));

    expect(screen.getByRole('button', { name: /oxxo esquina/i })).toBeInTheDocument();
  });

  it('si banos llega mientras escribo en el formulario (sin cercanos al abrir), el formulario no se reemplaza', async () => {
    const usuario = userEvent.setup();
    const { rerender } = render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} />);

    await usuario.type(screen.getByLabelText(/^nombre$/i), 'Café');
    rerender(<CrearBano ubicacion={UBICACION} banos={[BANO_A_40]} onVolver={() => {}} />);

    expect(screen.getByLabelText(/^nombre$/i)).toHaveValue('Café');
  });

  it('Volver en el formulario tras "Ninguno es este" regresa a la lista, no cierra el flujo', async () => {
    const usuario = userEvent.setup();
    const onVolver = vi.fn();
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_A_40]} onVolver={onVolver} />);

    await usuario.click(screen.getByRole('button', { name: /ninguno es este, crear nuevo/i }));
    expect(screen.getByText(/gracias por revisar/i)).toBeInTheDocument();
    await usuario.click(screen.getByRole('button', { name: /volver/i }));

    expect(onVolver).not.toHaveBeenCalled();
    expect(screen.getByRole('list', { name: /baños cerca de ti/i })).toBeInTheDocument();
  });

  it('sin ningún baño a <=200m habilita el formulario', () => {
    render(<CrearBano ubicacion={UBICACION} banos={[BANO_LEJOS]} onVolver={() => {}} />);

    expect(screen.getByLabelText(/^nombre$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/zona o colonia/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/tipo de lugar/i)).toBeInTheDocument();
  });

  it('sin baños cargados (banos vacío) también habilita el formulario', () => {
    render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} />);
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

  describe('props que cambian mientras el overlay está abierto', () => {
    it('una lectura nueva de GPS (objeto ubicacion nuevo) no le quita el foco al campo que estoy escribiendo', async () => {
      const usuario = userEvent.setup();
      const { rerender } = render(<CrearBano ubicacion={UBICACION} banos={[]} onVolver={() => {}} />);

      await usuario.type(screen.getByLabelText(/^nombre$/i), 'Café');
      expect(screen.getByLabelText(/^nombre$/i)).toHaveFocus();

      rerender(<CrearBano ubicacion={{ ...UBICACION }} banos={[]} onVolver={() => {}} />);
      rerender(<CrearBano ubicacion={{ lat: UBICACION.lat + 0.00001, lng: UBICACION.lng }} banos={[]} onVolver={() => {}} />);

      expect(screen.getByLabelText(/^nombre$/i)).toHaveFocus();
    });

    it('si la carga de baños falla, muestra un error de marca con Reintentar en vez de "buscando" para siempre', async () => {
      const usuario = userEvent.setup();
      const onReintentarBanos = vi.fn();
      render(
        <CrearBano
          ubicacion={UBICACION}
          banos={null}
          cargandoBanos={false}
          errorBanos="No pudimos traer los baños 😬 — intenta de nuevo."
          onReintentarBanos={onReintentarBanos}
          onVolver={() => {}}
        />
      );

      expect(screen.getByRole('alert')).toHaveTextContent(/no pudimos traer los baños/i);
      expect(screen.queryByText(/buscando baños cerca/i)).not.toBeInTheDocument();
      await usuario.click(screen.getByRole('button', { name: /reintentar/i }));
      expect(onReintentarBanos).toHaveBeenCalledTimes(1);
    });

    it('mientras la recarga está en curso tras un error, vuelve a "buscando" y luego muestra la lista', () => {
      const props = { ubicacion: UBICACION, onVolver: () => {}, onReintentarBanos: () => {} };
      const { rerender } = render(<CrearBano {...props} banos={null} cargandoBanos={false} errorBanos="falló" />);
      rerender(<CrearBano {...props} banos={null} cargandoBanos errorBanos={null} />);
      expect(screen.getByRole('status')).toHaveTextContent(/buscando baños cerca/i);

      rerender(<CrearBano {...props} banos={[BANO_A_40]} cargandoBanos={false} errorBanos={null} />);
      expect(screen.getByRole('button', { name: /oxxo esquina/i })).toBeInTheDocument();
    });

    it('entrando desde modo zona: no congela los baños sin distancia; al activar la ubicación espera la carga y lista los cercanos', () => {
      const BANO_ZONA = { ...BANO_A_40, distancia_metros: null };
      const props = { onVolver: () => {}, onReintentarUbicacion: () => {} };
      const { rerender } = render(<CrearBano {...props} ubicacion={null} banos={[BANO_ZONA]} cargandoBanos={false} />);
      expect(screen.getByText(/sin tu ubicación/i)).toBeInTheDocument();

      // Llega la ubicación: Mapa arranca la recarga en el mismo render.
      rerender(<CrearBano {...props} ubicacion={UBICACION} banos={[BANO_ZONA]} cargandoBanos />);
      expect(screen.getByRole('status')).toHaveTextContent(/buscando baños cerca/i);

      rerender(<CrearBano {...props} ubicacion={UBICACION} banos={[BANO_A_40]} cargandoBanos={false} />);
      expect(screen.getByRole('button', { name: /oxxo esquina/i })).toBeInTheDocument();
      expect(screen.queryByLabelText(/^nombre$/i)).not.toBeInTheDocument();
    });

    it('un refresco que falla después de congelar la lista no la cambia por la pantalla de error', () => {
      const props = { ubicacion: UBICACION, onVolver: () => {}, onReintentarBanos: () => {} };
      const { rerender } = render(<CrearBano {...props} banos={[BANO_A_40]} />);
      rerender(<CrearBano {...props} banos={null} cargandoBanos={false} errorBanos="falló" />);

      expect(screen.getByRole('button', { name: /oxxo esquina/i })).toBeInTheDocument();
      expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    });

    it('al reabrir un baño de la lista, el Detalle usa los datos frescos de banos (p. ej. el promedio tras calificar)', async () => {
      const usuario = userEvent.setup();
      const props = { ubicacion: UBICACION, onVolver: () => {} };
      const { rerender } = render(<CrearBano {...props} banos={[BANO_A_40]} />);

      await usuario.click(screen.getByRole('button', { name: /oxxo esquina/i }));
      rerender(<CrearBano {...props} banos={[{ ...BANO_A_40, calificacion_promedio: 4.5 }]} />);
      await usuario.click(screen.getAllByRole('button', { name: /volver/i })[0]);
      await usuario.click(screen.getByRole('button', { name: /oxxo esquina/i }));

      expect(screen.getByRole('dialog', { name: /detalle de oxxo esquina/i })).toHaveTextContent('4.5');
    });
  });
});
