import { Router } from 'express';
import * as controller from '../controllers/doctorsController.js';

const router = Router();
router.get('/', controller.clinics);

export default router;
