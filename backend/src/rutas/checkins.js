import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { verificarAutorizado } from '../middleware/autorizacion.js';
import { postCheckin } from '../controladores/checkinsController.js';

const router = Router();

router.post('/', verificarSesion, verificarAutorizado, postCheckin);

export default router;
