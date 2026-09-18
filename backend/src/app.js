import express from 'express';
import cors from 'cors';
import perfilesRouter from './rutas/perfiles.js';
import banosRouter from './rutas/banos.js';

// Separado de index.js para poder montar la app en tests (supertest) sin
// levantar un servidor real ni depender de un PORT libre.
export function crearApp() {
  // La librería `cors` trata un `origin` "falsy" como "refleja cualquier
  // origen" — si FRONTEND_ORIGIN falta, eso abriría CORS a todo el mundo en
  // silencio. Mejor fallar rápido y con un mensaje claro.
  if (!process.env.FRONTEND_ORIGIN) {
    throw new Error(
      'Falta FRONTEND_ORIGIN — sin ella, CORS quedaría abierto a cualquier origen. Copia backend/.env.example a backend/.env y define FRONTEND_ORIGIN.'
    );
  }

  const app = express();

  app.use(cors({ origin: process.env.FRONTEND_ORIGIN }));
  app.use(express.json());

  app.get('/', (_req, res) => {
    res.json({ estado: 'ok', servicio: 'cagapp-backend' });
  });

  app.use('/perfiles', perfilesRouter);
  app.use('/banos', banosRouter);

  app.use((_req, res) => {
    res.status(404).json({ error: 'Esa ruta no existe por aquí 🧭' });
  });

  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    console.error(error);
    res.status(500).json({ error: 'Algo tronó en el servidor 💥 — intenta de nuevo.' });
  });

  return app;
}

export default crearApp;
