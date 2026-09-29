import { Router } from 'express';
import { verificarSesion } from '../middleware/auth.js';
import { verificarAutorizado } from '../middleware/autorizacion.js';
import { getActividad, getPerfilYo, postPerfil } from '../controladores/perfilesController.js';

const router = Router();

router.post('/', verificarSesion, postPerfil);
router.get('/yo', verificarSesion, getPerfilYo);
router.get('/yo/actividad', verificarSesion, verificarAutorizado, getActividad);

export default router;
