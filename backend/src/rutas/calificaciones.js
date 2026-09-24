import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { getCalificacionesPublicas, postCalificacion } from '../controladores/calificacionesController.js';

const router = Router();

router.get('/', verificarSesion, getCalificacionesPublicas);
router.post('/', verificarSesion, postCalificacion);

export default router;
