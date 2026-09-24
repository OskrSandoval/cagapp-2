import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { postCalificacion } from '../controladores/calificacionesController.js';

const router = Router();

router.post('/', verificarSesion, postCalificacion);

export default router;
