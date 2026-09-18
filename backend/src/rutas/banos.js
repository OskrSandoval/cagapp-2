import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { getBanos } from '../controladores/banosController.js';

const router = Router();

router.get('/', verificarSesion, getBanos);

export default router;
