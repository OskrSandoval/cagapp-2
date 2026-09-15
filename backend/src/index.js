import 'dotenv/config';
import { crearApp } from './app.js';

const app = crearApp();
const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend de CagApp escuchando en http://localhost:${PORT} 🚽 (CORS: ${process.env.FRONTEND_ORIGIN})`);
});
