import { supabaseAdmin } from '../datos/supabaseAdmin.js';

// AD-5 / AD-12: cada ruta protegida verifica el JWT que emite Supabase Auth,
// enviado como `Authorization: Bearer <token>`. El backend nunca reimplementa
// ni guarda credenciales propias.
export async function verificarSesion(req, res, next) {
  const encabezado = req.headers.authorization || '';

  if (!/^Bearer\s+/i.test(encabezado)) {
    return res.status(401).json({ error: 'Necesitas iniciar sesión para esto 🔐' });
  }

  const token = encabezado.replace(/^Bearer\s+/i, '').trim();

  if (!token) {
    return res.status(401).json({ error: 'Necesitas iniciar sesión para esto 🔐' });
  }

  const { data, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !data?.user) {
    return res.status(401).json({ error: 'Tu sesión ya no es válida — vuelve a iniciar sesión 🔐' });
  }

  req.usuarioId = data.user.id;
  next();
}
