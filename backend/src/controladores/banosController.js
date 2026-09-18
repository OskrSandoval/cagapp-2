import { listarBanos } from '../servicios/banosService.js';

function leerNumero(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') return NaN;
  return Number(valor);
}

export async function getBanos(req, res) {
  const zona = typeof req.query.zona === 'string' ? req.query.zona.trim() : '';
  const hayCoordenadas = req.query.lat !== undefined || req.query.lng !== undefined;

  let lat;
  let lng;
  if (hayCoordenadas) {
    lat = leerNumero(req.query.lat);
    lng = leerNumero(req.query.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return res.status(400).json({ error: 'Esas coordenadas no cuadran 🧭 — manda lat y lng válidas.' });
    }
  } else if (!zona) {
    return res.status(400).json({ error: 'Dime dónde buscar 📍 — manda tu ubicación (lat y lng) o una zona.' });
  }

  try {
    const banos = await listarBanos({ lat, lng, zona: zona || undefined });
    return res.status(200).json(banos);
  } catch {
    return res.status(500).json({ error: 'No pudimos traer los baños 😬 — intenta de nuevo.' });
  }
}
