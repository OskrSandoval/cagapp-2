import { useRef, useState } from 'react';
import { supabase } from '../auth/supabaseClient';
import { mapearErrorAuth } from '../auth/mapearErrorAuth';
import { EMAIL_REGEX } from '../auth/validacionEmail';

/**
 * Story 1.3 AC1: pide el correo y llama a resetPasswordForEmail. Solo cubre
 * cuentas de correo/contraseña (único tipo que existe hoy) — la detección
 * de cuentas sociales queda diferida (ver deferred-work.md).
 */
export default function RecuperarAcceso({ onVolver }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviado, setEnviado] = useState(false);
  const [cargando, setCargando] = useState(false);

  const emailRef = useRef(null);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral('');

    const correo = email.trim();
    if (!correo) {
      setError('Escribe tu correo — lo necesitamos para identificarte.');
      emailRef.current?.focus();
      return;
    }
    if (!EMAIL_REGEX.test(correo)) {
      setError('Ese correo no se ve completo — revísalo.');
      emailRef.current?.focus();
      return;
    }
    setError('');

    setCargando(true);
    try {
      // No revelamos si la cuenta existe: el mensaje de confirmación es el
      // mismo se haya encontrado o no el correo (evita enumeración de cuentas).
      const { error: errorSupabase } = await supabase.auth.resetPasswordForEmail(correo, {
        redirectTo: window.location.origin,
      });
      if (errorSupabase) {
        setErrorGeneral(mapearErrorAuth(errorSupabase));
        return;
      }
      setEnviado(true);
    } catch (err) {
      setErrorGeneral(mapearErrorAuth(err));
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <div className="logo-emoji">🔑</div>
          <h1>
            Recuperar <span className="marca-app">acceso</span>
          </h1>
          <p>Te mandamos instrucciones para volver a entrar 📬</p>
        </div>

        <div className="olvide">
          <button type="button" onClick={onVolver} disabled={cargando}>
            ← Volver a iniciar sesión
          </button>
        </div>

        {enviado ? (
          <>
            <p className="aviso" role="status">
              Si ese correo tiene cuenta en CagApp, ya te mandamos instrucciones — revisa tu
              bandeja (y spam, por si las dudas) 📬
            </p>
            <button type="button" className="boton-primario" onClick={onVolver}>
              Volver a iniciar sesión
            </button>
          </>
        ) : (
          <form onSubmit={manejarEnvio} noValidate>
            <div className="campo">
              <label htmlFor="emailRecuperar">Correo electrónico</label>
              <input
                id="emailRecuperar"
                type="email"
                placeholder="tu@correo.com"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                ref={emailRef}
                aria-invalid={Boolean(error)}
                className={error ? 'con-error' : ''}
              />
              {error && <p className="mensaje-error">{error}</p>}
            </div>

            {errorGeneral && (
              <p className="mensaje-error mensaje-error-general" role="alert">
                {errorGeneral}
              </p>
            )}

            <button type="submit" className="boton-primario" disabled={cargando}>
              Mandar instrucciones 📤
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
