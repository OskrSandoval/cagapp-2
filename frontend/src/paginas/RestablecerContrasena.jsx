import { useRef, useState } from 'react';
import { supabase } from '../auth/supabaseClient';
import { mapearErrorAuth } from '../auth/mapearErrorAuth';

/**
 * App.jsx la muestra en cuanto onAuthStateChange emite PASSWORD_RECOVERY
 * (el usuario llegó desde el link del correo), antes que cualquier otra
 * pantalla. Fija la nueva contraseña vía updateUser; al terminar, la sesión
 * de recuperación ya es una sesión normal y el flujo sigue post-login.
 */
export default function RestablecerContrasena({ onCompletado }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [errorGeneral, setErrorGeneral] = useState('');
  const [enviando, setEnviando] = useState(false);

  const passwordRef = useRef(null);

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral('');

    if (!password) {
      setError('Escribe tu nueva contraseña.');
      passwordRef.current?.focus();
      return;
    }
    if (password.length < 6) {
      // Reusamos mapearErrorAuth con el mismo mensaje que produciría
      // Supabase, para no duplicar el copy de "contraseña floja" en dos
      // lugares — y no llamamos a updateUser con una contraseña que ya
      // sabemos que Supabase rechazará.
      setError(mapearErrorAuth({ message: 'Password should be at least 6 characters.' }));
      passwordRef.current?.focus();
      return;
    }
    setError('');

    setEnviando(true);
    try {
      const { error: errorSupabase } = await supabase.auth.updateUser({ password });
      if (errorSupabase) {
        setErrorGeneral(mapearErrorAuth(errorSupabase));
        return;
      }
      onCompletado?.();
    } catch (err) {
      setErrorGeneral(mapearErrorAuth(err));
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <div className="logo-emoji">🔑</div>
          <h1>
            Restablecer <span className="marca-app">contraseña</span>
          </h1>
          <p>Ya casi — fija tu nueva contraseña para volver a entrar 🔐</p>
        </div>

        <form onSubmit={manejarEnvio} noValidate>
          <div className="campo">
            <label htmlFor="nuevaContrasena">Nueva contraseña</label>
            <input
              id="nuevaContrasena"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              ref={passwordRef}
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

          <button type="submit" className="boton-primario" disabled={enviando}>
            Guardar contraseña y entrar 🚪
          </button>

          <div className="olvide">
            <button type="button" onClick={onCompletado} disabled={enviando}>
              Cancelar y volver
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
