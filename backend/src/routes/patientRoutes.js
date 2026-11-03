import { Router } from 'express';
import * as controller from '../controllers/patientsController.js';
import { authenticate, requireRole, requireVerifiedEmail } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { updatePatientProfileSchema } from '../validators/patients.js';

const router = Router();

router.use(authenticate, requireVerifiedEmail, requireRole('patient'));
router.get('/me', controller.getMe);
router.patch('/me', validate(updatePatientProfileSchema), controller.updateMe);
router.get('/me/dashboard', controller.dashboard);

export default router;
