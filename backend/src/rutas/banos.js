import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { verificarAutorizado } from '../middleware/autorizacion.js';
import { getBanos, postBano } from '../controladores/banosController.js';

const router = Router();

router.get('/', verificarSesion, verificarAutorizado, getBanos);
router.post('/', verificarSesion, verificarAutorizado, postBano);

export default router;
