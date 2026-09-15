// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { mapearErrorAuth } from '../src/auth/mapearErrorAuth.js';

describe('mapearErrorAuth', () => {
  it('mapea correo duplicado a un mensaje claro con tono de marca', () => {
    const mensaje = mapearErrorAuth({ message: 'User already registered' });
    expect(mensaje).toMatch(/ya tiene cuenta/i);
  });

  it('mapea contraseña débil a un mensaje claro con tono de marca', () => {
    const mensaje = mapearErrorAuth({ message: 'Password should be at least 6 characters' });
    expect(mensaje).toMatch(/floja|caracteres/i);
  });

  it('mapea credenciales inválidas a un mensaje claro', () => {
    const mensaje = mapearErrorAuth({ message: 'Invalid login credentials' });
    expect(mensaje).toMatch(/incorrect/i);
  });

  it('nunca deja pasar el string técnico crudo de Supabase', () => {
    const mensaje = mapearErrorAuth({ message: 'User already registered' });
    expect(mensaje.toLowerCase()).not.toContain('already registered');
  });

  it('devuelve null si no hay error', () => {
    expect(mapearErrorAuth(null)).toBeNull();
  });

  it('cae en un mensaje genérico de marca para errores desconocidos', () => {
    const mensaje = mapearErrorAuth({ message: 'algo raro que no reconocemos' });
    expect(mensaje).toMatch(/no es tu culpa/i);
  });
});
