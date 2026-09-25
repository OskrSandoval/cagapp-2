import { useRef, useState } from 'react';
import { supabase } from '../auth/supabaseClient';
import { mapearErrorAuth } from '../auth/mapearErrorAuth';
import { crearPerfil } from '../api/perfilesApi';
import { EMAIL_REGEX } from '../auth/validacionEmail';
import RecuperarAcceso from './RecuperarAcceso';

export default function Login({ onAutenticado }) {
  const [vista, setVista] = useState('formulario'); // 'formulario' | 'recuperar'
  const [tab, setTab] = useState('login'); // 'login' | 'registro'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nombreParaMostrar, setNombreParaMostrar] = useState('');
  const [errores, setErrores] = useState({});
  const [errorGeneral, setErrorGeneral] = useState('');
  const [cargando, setCargando] = useState(false);

  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const nombreRef = useRef(null);

  function cambiarTab(siguiente) {
    setTab(siguiente);
    setErrores({});
    setErrorGeneral('');
    // Los campos compartidos (correo) se conservan; solo se limpia lo
    // exclusivo de la otra pestaña (nombre para mostrar).
    if (siguiente === 'login') {
      setNombreParaMostrar('');
    }
  }

  function validar() {
    const nuevosErrores = {};
    if (!email.trim()) {
      nuevosErrores.email = 'Escribe tu correo — lo necesitamos para identificarte.';
    } else if (!EMAIL_REGEX.test(email.trim())) {
      nuevosErrores.email = 'Ese correo no se ve completo — revísalo.';
    }

    if (!password) {
      nuevosErrores.password = 'Escribe tu contraseña.';
    }

    if (tab === 'registro' && !nombreParaMostrar.trim()) {
      nuevosErrores.nombreParaMostrar = '¿Cómo te llamamos? Escribe tu nombre para mostrar.';
    }

    return nuevosErrores;
  }

  function enfocarPrimerError(nuevosErrores) {
    if (nuevosErrores.email) {
      emailRef.current?.focus();
    } else if (nuevosErrores.password) {
      passwordRef.current?.focus();
    } else if (nuevosErrores.nombreParaMostrar) {
      nombreRef.current?.focus();
    }
  }

  async function manejarEnvio(evento) {
    evento.preventDefault();
    setErrorGeneral('');

    const nuevosErrores = validar();
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) {
      enfocarPrimerError(nuevosErrores);
      return;
    }

    setCargando(true);
    try {
      if (tab === 'registro') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorGeneral(mapearErrorAuth(error));
          return;
        }

        if (!data?.session) {
          // Pasaría si alguna vez se reactiva "Confirm email" en Supabase:
          // el usuario se crea pero no queda autenticado de inmediato.
          setErrorGeneral(
            'Tu cuenta se creó, pero necesitamos confirmar tu correo antes de dejarte entrar — revisa tu bandeja 📬'
          );
          return;
        }

        // AD-10: inmediatamente después de crear el usuario en Auth, el
        // frontend crea su fila en `perfiles` vía el backend.
        try {
          await crearPerfil(nombreParaMostrar.trim());
        } catch {
          // El usuario ya quedó autenticado; si esto falla (red caída,
          // backend abajo) la app le pedirá completar su perfil al
          // detectar el 404 en GET /perfiles/yo — el reintento es seguro
          // porque POST /perfiles es idempotente.
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (error) {
          setErrorGeneral(mapearErrorAuth(error));
          return;
        }
      }

      onAutenticado?.();
    } catch (err) {
      // Retro Épica 1, action item #1: una promesa rechazada (falla de red,
      // no solo un `{error}` de Supabase) se queda sin mensaje sin este
      // catch — mismo patrón que ya usan RecuperarAcceso.jsx/
      // RestablecerContrasena.jsx (Story 1.3).
      setErrorGeneral(mapearErrorAuth(err));
    } finally {
      setCargando(false);
    }
  }

  if (vista === 'recuperar') {
    return <RecuperarAcceso onVolver={() => setVista('formulario')} />;
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <div className="logo-emoji">💩</div>
          <h1>
            Cag<span className="marca-app">App</span>
          </h1>
          <p>
            Porque encontrar baño digno
            <br />
            no debería sentirse una lotería 🎲
          </p>
        </div>

        <div className="pestanas" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'login'}
            className={`pestana ${tab === 'login' ? 'activa' : ''}`}
            onClick={() => cambiarTab('login')}
          >
            Iniciar sesión
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === 'registro'}
            className={`pestana ${tab === 'registro' ? 'activa' : ''}`}
            onClick={() => cambiarTab('registro')}
          >
            Crear cuenta
          </button>
        </div>

        <form onSubmit={manejarEnvio} noValidate>
          <div className="campo">
            <label htmlFor="email">Correo electrónico</label>
            <input
              id="email"
              type="email"
              placeholder="tu@correo.com"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              ref={emailRef}
              aria-invalid={Boolean(errores.email)}
              className={errores.email ? 'con-error' : ''}
            />
            {errores.email && <p className="mensaje-error">{errores.email}</p>}
          </div>

          <div className="campo">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              placeholder="••••••••"
              autoComplete={tab === 'registro' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              ref={passwordRef}
              aria-invalid={Boolean(errores.password)}
              className={errores.password ? 'con-error' : ''}
            />
            {errores.password && <p className="mensaje-error">{errores.password}</p>}
          </div>

          {tab === 'registro' && (
            <div className="campo">
              <label htmlFor="nombreParaMostrar">Nombre para mostrar</label>
              <input
                id="nombreParaMostrar"
                type="text"
                placeholder="¿Cómo te decimos?"
                autoComplete="nickname"
                value={nombreParaMostrar}
                onChange={(e) => setNombreParaMostrar(e.target.value)}
                ref={nombreRef}
                aria-invalid={Boolean(errores.nombreParaMostrar)}
                className={errores.nombreParaMostrar ? 'con-error' : ''}
              />
              {errores.nombreParaMostrar && <p className="mensaje-error">{errores.nombreParaMostrar}</p>}
            </div>
          )}

          {tab === 'login' && (
            <div className="olvide">
              <button type="button" onClick={() => setVista('recuperar')}>
                ¿Se te olvidó? Recupérala aquí 🔑
              </button>
            </div>
          )}

          {errorGeneral && (
            <p className="mensaje-error mensaje-error-general" role="alert">
              {errorGeneral}
            </p>
          )}

          <button type="submit" className="boton-primario" disabled={cargando}>
            {tab === 'login' ? 'Entrar y encontrar baño 💩' : 'Crear cuenta y encontrar baño 💩'}
          </button>
        </form>

        <p className="nota-final">
          Necesitas cuenta para todo en CagApp — hasta para nomás ver el mapa.
          <br />
          Es rapidísimo, lo prometemos 🤙
        </p>
      </div>
    </div>
  );
}
