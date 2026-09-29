import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { verificarAutorizado } from '../middleware/autorizacion.js';
import { getEstado, postSugerencia } from '../controladores/sugerenciasController.js';

const router = Router();

// Solo escritura: no hay endpoint para leer o listar sugerencias.
router.get('/estado', verificarSesion, verificarAutorizado, getEstado);
router.post('/', verificarSesion, verificarAutorizado, postSugerencia);

export default router;
