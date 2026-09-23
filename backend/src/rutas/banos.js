import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { getBanos, postBano } from '../controladores/banosController.js';

const router = Router();

router.get('/', verificarSesion, getBanos);
router.post('/', verificarSesion, postBano);

export default router;
