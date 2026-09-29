import { obtenerPerfilPorId } from '../servicios/perfilesService.js';

// Gate "friends and family" del lado del servidor: va siempre después de
// `verificarSesion` (necesita `req.usuarioId`). Espejo de `App.jsx`: solo
// `autorizado === false` bloquea — un campo ausente (migración 005 aún no
// corrida) se deja pasar para no dejar fuera a todo el mundo. Sin perfil no
// hay autorización posible. `POST /perfiles` y `GET /perfiles/yo` NO llevan
// este middleware: el registro es libre y el frontend necesita leer
// `autorizado` para mostrar `EnEspera`.
export async function verificarAutorizado(req, res, next) {
  let perfil;
  try {
    perfil = await obtenerPerfilPorId(req.usuarioId);
  } catch (error) {
    console.error('No pudimos leer el perfil para el gate de autorización:', error);
    return res.status(500).json({ error: 'No pudimos revisar tu acceso 😬 — intenta de nuevo.' });
  }

  if (!perfil || perfil.autorizado === false) {
    return res.status(403).json({ error: 'CagApp anda en modo VIP 🕶️ — tu acceso todavía no está listo.' });
  }

  next();
}
