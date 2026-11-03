import { Router } from 'express';
import * as controller from '../controllers/doctorsController.js';

const router = Router();
router.get('/', controller.specialties);

export default router;
