import { crearOActualizarPerfil, obtenerActividad, obtenerPerfilPorId } from '../servicios/perfilesService.js';

// El `id` siempre sale del JWT ya verificado (req.usuarioId), nunca del
// body — el body solo trae `{ nombre_para_mostrar }` (constraint de la spec).
export async function postPerfil(req, res) {
  const nombreParaMostrar = req.body?.nombre_para_mostrar;

  if (!nombreParaMostrar || typeof nombreParaMostrar !== 'string' || !nombreParaMostrar.trim()) {
    return res.status(400).json({ error: 'Necesitamos saber cómo te llamamos 🙋 — manda tu nombre para mostrar.' });
  }

  if (nombreParaMostrar.trim().length > 100) {
    return res.status(400).json({ error: 'Ese nombre está muy largo 📏 — máximo 100 caracteres.' });
  }

  try {
    const perfil = await crearOActualizarPerfil({
      id: req.usuarioId,
      nombreParaMostrar: String(nombreParaMostrar).trim(),
    });
    return res.status(200).json(perfil);
  } catch {
    return res.status(500).json({ error: 'No pudimos guardar tu perfil 😬 — intenta de nuevo.' });
  }
}

export async function getPerfilYo(req, res) {
  try {
    const perfil = await obtenerPerfilPorId(req.usuarioId);
    if (!perfil) {
      return res.status(404).json({ error: 'Todavía no tienes perfil por aquí 🤷' });
    }
    return res.status(200).json(perfil);
  } catch {
    return res.status(500).json({ error: 'No pudimos revisar tu perfil 😬 — intenta de nuevo.' });
  }
}

// Story 4.1: `req.usuarioId` sale del JWT verificado — nunca hay forma de
// pedir la actividad de otro usuario desde acá. Responde 200 con `[]` si no
// hay actividad (nunca 404): el frontend es quien decide cómo presentar esa
// lista vacía (invitación chusca), esta capa solo entrega el dato.
export async function getActividad(req, res) {
  try {
    const actividad = await obtenerActividad(req.usuarioId);
    return res.status(200).json(actividad);
  } catch {
    return res.status(500).json({ error: 'No pudimos revisar tu actividad 😬 — intenta de nuevo.' });
  }
}
