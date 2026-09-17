// Regex de formato de correo compartida entre Login.jsx y RecuperarAcceso.jsx
// (ambos validan "vacío" y "formato" de la misma manera antes de llamar al
// SDK de Supabase).
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
