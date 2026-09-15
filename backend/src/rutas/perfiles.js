import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { getPerfilYo, postPerfil } from '../controladores/perfilesController.js';

const router = Router();

router.post('/', verificarSesion, postPerfil);
router.get('/yo', verificarSesion, getPerfilYo);

export default router;
