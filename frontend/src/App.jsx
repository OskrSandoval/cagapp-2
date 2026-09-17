import { useEffect, useState } from 'react';
import { supabase } from './auth/supabaseClient';
import { obtenerMiPerfil } from './api/perfilesApi';
import Login from './paginas/Login';
import CompletarPerfil from './paginas/CompletarPerfil';
import RestablecerContrasena from './paginas/RestablecerContrasena';

// Story 1.1 solo cubre registro + configuración inicial: no existe todavía
// una "app real" detrás del login (eso llega en épicas futuras). Esta
// pantalla de bienvenida es un placeholder mínimo para poder verificar el
// flujo completo (Auth + perfil) de punta a punta.
function Bienvenida({ perfil, onCerrarSesion }) {
  return (
    <div className="pantalla-login">
      <div className="tarjeta-login">
        <div className="marca">
          <div className="logo-emoji">💩</div>
          <h1>
            Ya <span className="marca-app">estás</span> dentro
          </h1>
          <p>Qué gusto verte, {perfil?.nombre_para_mostrar} 🎉</p>
        </div>
        <button type="button" className="boton-primario" onClick={onCerrarSesion}>
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default function App() {
  const [sesion, setSesion] = useState(undefined); // undefined = cargando
  const [perfil, setPerfil] = useState(undefined); // undefined = sin revisar, null = 404
  // Story 1.3: true cuando el usuario llegó desde el link de recuperación de
  // contraseña (Supabase emite el evento PASSWORD_RECOVERY vía
  // onAuthStateChange). Manda a "Restablecer contraseña" antes que
  // cualquier otra pantalla, aunque la sesión de recuperación ya exista.
  const [enRecuperacion, setEnRecuperacion] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSesion(data.session));

    const { data: suscripcion } = supabase.auth.onAuthStateChange((evento, nuevaSesion) => {
      setSesion(nuevaSesion);
      if (evento === 'PASSWORD_RECOVERY') {
        setEnRecuperacion(true);
      }
      if (!nuevaSesion) {
        setPerfil(undefined);
      }
    });

    return () => suscripcion.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!sesion) return;

    let cancelado = false;
    obtenerMiPerfil()
      .then((resultado) => {
        if (!cancelado) setPerfil(resultado);
      })
      .catch((error) => {
        // Un error real (red caída, 500, token vencido) no es lo mismo que
        // "no tienes perfil" (404, que ya resuelve a null arriba) — nunca lo
        // tratamos igual, o mandaríamos al usuario a CompletarPerfil y su
        // upsert idempotente podría pisar un nombre_para_mostrar existente.
        // Dejamos `perfil` en `undefined` (pantalla de carga) en vez de null.
        // eslint-disable-next-line no-console
        console.error('No pudimos revisar el perfil del usuario:', error);
      });

    return () => {
      cancelado = true;
    };
  }, [sesion]);

  if (sesion === undefined) {
    return null; // evita parpadeo mientras Supabase resuelve la sesión guardada
  }

  if (enRecuperacion) {
    return <RestablecerContrasena onCompletado={() => setEnRecuperacion(false)} />;
  }

  if (!sesion) {
    return <Login onAutenticado={() => {}} />;
  }

  if (perfil === undefined) {
    return null; // revisando GET /perfiles/yo
  }

  if (perfil === null) {
    return <CompletarPerfil onCompletado={(nuevoPerfil) => setPerfil(nuevoPerfil)} />;
  }

  return (
    <Bienvenida
      perfil={perfil}
      onCerrarSesion={async () => {
        await supabase.auth.signOut();
      }}
    />
  );
}
