import { crearBano, listarBanos } from '../servicios/banosService.js';

function leerNumero(valor) {
  if (typeof valor !== 'string' || valor.trim() === '') return NaN;
  return Number(valor);
}

// El body de POST /banos manda lat/lng como número JSON (no string de query
// string como en GET /banos), así que la validación acepta ambos casos.
function leerNumeroDeCuerpo(valor) {
  if (typeof valor === 'number') return valor;
  if (typeof valor === 'string' && valor.trim() !== '') return Number(valor);
  return NaN;
}

function leerTextoRequerido(valor) {
  return typeof valor === 'string' ? valor.trim() : '';
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

// `creado_por` sale de `req.usuarioId` (JWT verificado por `verificarSesion`),
// nunca del body — mismo tratamiento que `postPerfil` con `id`. La ubicación
// (`lat`/`lng`) es la del dispositivo, capturada una sola vez al abrir el
// flujo de Crear Baño en el frontend (nunca editable ni un picker de mapa),
// pero de todas formas se valida aquí como cualquier otro dato del body.
export async function postBano(req, res) {
  const nombre = leerTextoRequerido(req.body?.nombre);
  const zona = leerTextoRequerido(req.body?.zona);
  const tipoLugar = leerTextoRequerido(req.body?.tipo_lugar);
  const lat = leerNumeroDeCuerpo(req.body?.lat);
  const lng = leerNumeroDeCuerpo(req.body?.lng);

  if (!nombre) {
    return res.status(400).json({ error: '¿Cómo se llama el baño? Escribe un nombre 🚽.' });
  }

  if (nombre.length > 100) {
    return res.status(400).json({ error: 'Ese nombre está muy largo 📏 — máximo 100 caracteres.' });
  }

  if (!zona) {
    return res.status(400).json({ error: 'Dinos en qué zona o colonia está 📍.' });
  }

  if (zona.length > 100) {
    return res.status(400).json({ error: 'Esa zona está muy larga 📏 — máximo 100 caracteres.' });
  }

  if (!tipoLugar) {
    return res.status(400).json({ error: 'Dinos qué tipo de lugar es 🏷️.' });
  }

  if (tipoLugar.length > 100) {
    return res.status(400).json({ error: 'Ese tipo de lugar está muy largo 📏 — máximo 100 caracteres.' });
  }

  if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return res.status(400).json({ error: 'Esas coordenadas no cuadran 🧭 — necesitamos tu ubicación válida.' });
  }

  try {
    const bano = await crearBano({ nombre, lat, lng, tipoLugar, zona, creadoPor: req.usuarioId });
    return res.status(201).json(bano);
  } catch {
    return res.status(500).json({ error: 'No pudimos crear el baño 😬 — intenta de nuevo.' });
  }
}
