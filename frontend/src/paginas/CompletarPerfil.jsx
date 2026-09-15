import { useRef, useState } from 'react';
import { crearPerfil } from '../api/perfilesApi';

/**
 * Se muestra cuando el usuario ya está autenticado pero GET /perfiles/yo
 * respondió 404 (ej. el registro se cortó antes de crear el perfil). Le
 * pedimos su nombre para mostrar y reintentamos POST /perfiles, que es
 * idempotente así que reintentar nunca duplica ni falla.
 */
export default function CompletarPerfil({ onCompletado }) {
  const [nombreParaMostrar, setNombreParaMostrar] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const inputRef = useRef(null);

  async function manejarEnvio(evento) {
    evento.preventDefault();

    if (!nombreParaMostrar.trim()) {
      setError('¿Cómo te llamamos? Escribe tu nombre para mostrar.');
      inputRef.current?.focus();
      return;
    }

    setError('');
    setEnviando(true);
    try {
      const perfil = await crearPerfil(nombreParaMostrar.trim());
      onCompletado?.(perfil);
    } catch (err) {
      setError(err.message || 'No pudimos guardar tu perfil 😬 — intenta de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <div className="logo-emoji">💩</div>
          <h1>
            Ya casi <span className="marca-app">llegas</span>
          </h1>
          <p>Nos falta saber cómo te llamamos antes de dejarte pasar 🙌</p>
        </div>

        <form onSubmit={manejarEnvio} noValidate>
          <div className="campo">
            <label htmlFor="nombreParaMostrar">Nombre para mostrar</label>
            <input
              id="nombreParaMostrar"
              type="text"
              placeholder="¿Cómo te decimos?"
              autoComplete="nickname"
              value={nombreParaMostrar}
              onChange={(e) => setNombreParaMostrar(e.target.value)}
              ref={inputRef}
              aria-invalid={Boolean(error)}
              className={error ? 'con-error' : ''}
            />
            {error && <p className="mensaje-error">{error}</p>}
          </div>

          <button type="submit" className="boton-primario" disabled={enviando}>
            Guardar y entrar 🚪
          </button>
        </form>
      </div>
    </div>
  );
}
