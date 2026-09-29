import { crearSugerencia, sugerenciasActivas } from '../servicios/sugerenciasService.js';

export const TIPOS_SUGERENCIA = ['bug', 'sugerencia'];
export const MAX_CARACTERES_SUGERENCIA = 2000;

// Copy chusca (AD-6): lo único que le llega al usuario es este texto.
const MENSAJE_BUZON_CERRADO = 'El buzón de sugerencias ya cerró 📪 — ¡gracias por la buena onda!';
const MENSAJE_TIPO_INVALIDO = '¿Es un bug o una sugerencia? 🤔 — elige una de las dos.';
const MENSAJE_TEXTO_VACIO = 'Cuéntanos algo 💬 — el mensaje no puede ir vacío.';
const MENSAJE_TEXTO_LARGO = `Te inspiraste 📜 — máximo ${MAX_CARACTERES_SUGERENCIA} caracteres.`;
const MENSAJE_ERROR_ENVIO = 'No pudimos mandar tu mensaje 😬 — intenta de nuevo.';
const MENSAJE_ERROR_ESTADO = 'No pudimos revisar el buzón 😬 — intenta de nuevo.';

/**
 * `GET /sugerencias/estado` → `{ activas: boolean }`. Sin fila en
 * `configuracion` responde `{ activas: false }`.
 */
export async function getEstado(_req, res) {
  try {
    const activas = await sugerenciasActivas();
    return res.status(200).json({ activas });
  } catch {
    return res.status(500).json({ error: MENSAJE_ERROR_ESTADO });
  }
}

/**
 * `POST /sugerencias`: 201 con la fila creada, 400 si el tipo o el texto no
 * cuadran, 404 si el switch de la fase está apagado. `usuarioId` sale de
 * `req.usuarioId`, nunca del body.
 */
export async function postSugerencia(req, res) {
  try {
    if (!(await sugerenciasActivas())) {
      return res.status(404).json({ error: MENSAJE_BUZON_CERRADO });
    }
  } catch {
    return res.status(500).json({ error: MENSAJE_ERROR_ENVIO });
  }

  const tipo = req.body?.tipo;
  if (!TIPOS_SUGERENCIA.includes(tipo)) {
    return res.status(400).json({ error: MENSAJE_TIPO_INVALIDO });
  }

  const texto = typeof req.body?.texto === 'string' ? req.body.texto.trim() : '';
  if (!texto) {
    return res.status(400).json({ error: MENSAJE_TEXTO_VACIO });
  }

  if (texto.length > MAX_CARACTERES_SUGERENCIA) {
    return res.status(400).json({ error: MENSAJE_TEXTO_LARGO });
  }

  try {
    const sugerencia = await crearSugerencia({ usuarioId: req.usuarioId, tipo, texto });
    return res.status(201).json(sugerencia);
  } catch {
    return res.status(500).json({ error: MENSAJE_ERROR_ENVIO });
  }
}
