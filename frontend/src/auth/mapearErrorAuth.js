// Traduce los errores crudos de Supabase Auth a copy con tono de marca
// (EXPERIENCE.md § Voice and Tone) — nunca mostramos strings técnicos
// genéricos como "Authentication failed" directo al usuario.

export function mapearErrorAuth(error) {
  if (!error) return null;

  const mensaje = (error.message || '').toLowerCase();

  if (mensaje.includes('already registered') || mensaje.includes('already exists') || mensaje.includes('user already registered')) {
    return 'Ese correo ya tiene cuenta en CagApp 🚽 — mejor inicia sesión.';
  }

  if (mensaje.includes('password') && mensaje.includes('different')) {
    return 'Tu nueva contraseña debe ser diferente a la anterior 🔁 — prueba con otra.';
  }

  if (mensaje.includes('password') && (mensaje.includes('at least') || mensaje.includes('should be') || mensaje.includes('short') || mensaje.includes('weak') || mensaje.includes('characters'))) {
    return 'Esa contraseña está muy floja 💦 — necesita al menos 6 caracteres.';
  }

  if (mensaje.includes('session') && (mensaje.includes('missing') || mensaje.includes('expired') || mensaje.includes('not found'))) {
    return 'Tu sesión de recuperación ya venció — pide un nuevo link e inténtalo otra vez 🔄';
  }

  if (mensaje.includes('invalid login credentials') || mensaje.includes('invalid_credentials')) {
    return 'Correo o contraseña incorrectos — checa bien y vuelve a intentar 🔐';
  }

  if (mensaje.includes('email') && mensaje.includes('invalid')) {
    return 'Ese correo no nos cuadra 🤔 — revisa que esté bien escrito.';
  }

  return 'Algo salió mal, pero no es tu culpa 🙈 — intenta de nuevo en un momento.';
}
