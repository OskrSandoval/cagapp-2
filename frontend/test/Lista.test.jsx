import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import Lista from '../src/paginas/Lista.jsx';

const BANO_CERCA = {
  id: '1',
  nombre: 'Plaza Uno',
  zona: 'Centro',
  lat: 19.43,
  lng: -99.13,
  calificacion_promedio: 4.25,
  distancia_metros: 120,
};

const BANO_LEJOS = {
  id: '2',
  nombre: 'Plaza Dos',
  zona: 'Roma Norte',
  lat: 19.45,
  lng: -99.15,
  calificacion_promedio: null,
  distancia_metros: 2500,
};

describe('Lista', () => {
  it('sin baños no renderiza nada (null-safe)', () => {
    const { container: sinLista } = render(<Lista banos={null} />);
    expect(sinLista).toBeEmptyDOMElement();

    const { container: vacia } = render(<Lista banos={[]} />);
    expect(vacia).toBeEmptyDOMElement();
  });

  it('cada fila muestra nombre, badge con el número exacto y distancia formateada en m/km', () => {
    render(<Lista banos={[BANO_CERCA, BANO_LEJOS]} />);

    expect(screen.getByText('Plaza Uno')).toBeInTheDocument();
    expect(screen.getByText('🚽 4.3★')).toBeInTheDocument();
    expect(screen.getByText(/120 m/)).toBeInTheDocument();

    expect(screen.getByText('Plaza Dos')).toBeInTheDocument();
    expect(screen.getByText('🚽 sin calificaciones')).toBeInTheDocument();
    expect(screen.getByText(/2\.5 km/)).toBeInTheDocument();
  });

  it('las filas respetan el orden por cercanía que ya trae el arreglo del backend', () => {
    render(<Lista banos={[BANO_CERCA, BANO_LEJOS]} />);

    const filas = screen.getAllByRole('listitem');
    expect(filas).toHaveLength(2);
    expect(filas[0]).toHaveTextContent('Plaza Uno');
    expect(filas[1]).toHaveTextContent('Plaza Dos');
  });

  it('sin distancia (modo zona, sin ubicación) no revienta y omite la distancia', () => {
    const banoSinDistancia = { ...BANO_CERCA, distancia_metros: null };
    render(<Lista banos={[banoSinDistancia]} />);

    expect(screen.getByText('Plaza Uno')).toBeInTheDocument();
    expect(screen.getByText('Centro')).toBeInTheDocument();
  });
});
