import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { verificarAutorizado } from '../middleware/autorizacion.js';
import { getCalificacionesPublicas, postCalificacion } from '../controladores/calificacionesController.js';

const router = Router();

router.get('/', verificarSesion, verificarAutorizado, getCalificacionesPublicas);
router.post('/', verificarSesion, verificarAutorizado, postCalificacion);

export default router;
