import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { getActividad, getPerfilYo, postPerfil } from '../controladores/perfilesController.js';

const router = Router();

router.post('/', verificarSesion, postPerfil);
router.get('/yo', verificarSesion, getPerfilYo);
router.get('/yo/actividad', verificarSesion, getActividad);

export default router;
