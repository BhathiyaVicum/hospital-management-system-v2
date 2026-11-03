import { Router } from 'express';
import * as controller from '../controllers/appointmentsController.js';
import { authenticate, requireRole, requireVerifiedEmail } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  appointmentIdSchema,
  createAppointmentSchema,
  listAppointmentsSchema,
  rescheduleAppointmentSchema,
} from '../validators/appointments.js';

const router = Router();
router.use(authenticate, requireVerifiedEmail, requireRole('patient'));
router.get('/', validate(listAppointmentsSchema), controller.list);
router.post('/', validate(createAppointmentSchema), controller.create);
router.get('/:appointmentId', validate(appointmentIdSchema), controller.getById);
router.post('/:appointmentId/cancel', validate(appointmentIdSchema), controller.cancel);
router.patch('/:appointmentId/cancel', validate(appointmentIdSchema), controller.cancel);
router.patch('/:appointmentId', validate(rescheduleAppointmentSchema), controller.reschedule);

export default router;
