import { Router } from 'express';
import * as controller from '../controllers/doctorsController.js';
import { validate } from '../middleware/validate.js';
import { doctorIdSchema, doctorListSchema } from '../validators/doctors.js';

const router = Router();

router.get('/', validate(doctorListSchema), controller.list);
router.get('/:doctorId/availability', validate(doctorIdSchema), controller.availability);
router.get('/:doctorId', validate(doctorIdSchema), controller.getById);

export default router;
