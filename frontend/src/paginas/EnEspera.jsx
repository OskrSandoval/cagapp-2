import { useEffect } from 'react';

const TIEMPO_ESPERA_MS = 30000;

// Pantalla de espera del gate "friends and family": se muestra cuando
// `perfil.autorizado === false` (ver App.jsx). Puramente informativa — no
// recibe datos del perfil ni hace fetch. El temporizador vive aquí (no en
// App.jsx) para que el propio ciclo de montaje/desmontaje lo limpie solo.
export default function EnEspera({ onTiempoAgotado }) {
  useEffect(() => {
    const idTemporizador = setTimeout(onTiempoAgotado, TIEMPO_ESPERA_MS);
    return () => clearTimeout(idTemporizador);
  }, [onTiempoAgotado]);

  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <div className="logo-emoji">🚧</div>
          <h1>
            Cag<span className="marca-app">App</span> modo VIP
          </h1>
        </div>

        <div className="surface-tarjeta en-espera-mensaje" role="status">
          <p>
            Tu cuenta ya está en la fila para entrar — el equipo la está revisando a mano, uno por uno,
            como en los antros exclusivos 🕶️
          </p>
          <p>
            En unos segundos vamos a cerrar esta sesión. Cuando ya estés autorizado, vuelve a entrar
            con tu correo y contraseña de siempre.
          </p>
        </div>
      </div>
    </div>
  );
}
