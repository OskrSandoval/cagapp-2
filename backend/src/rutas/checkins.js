import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { postCheckin } from '../controladores/checkinsController.js';

const router = Router();

router.post('/', verificarSesion, postCheckin);

export default router;
