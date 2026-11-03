import { Router } from 'express';
import * as controller from '../controllers/workspaceController.js';
import { authenticate, requireRole, requireVerifiedEmail } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  receptionistAppointmentListSchema,
  receptionistAppointmentIdSchema,
  receptionistClinicQuerySchema,
  receptionistCreateAppointmentSchema,
  receptionistDoctorSlotsSchema,
  receptionistPatientCreateSchema,
  receptionistPatientLinkSchema,
  receptionistPatientSearchSchema,
  receptionistPatientUpdateSchema,
  receptionistProfileSchema,
  receptionistRescheduleSchema,
  receptionistWorkflowSchema,
} from '../validators/workspace.js';

const router = Router();
router.use(authenticate, requireVerifiedEmail, requireRole('receptionist'));
router.get('/dashboard', controller.receptionistDashboard);
router.get('/profile', controller.receptionistProfile);
router.patch('/profile', validate(receptionistProfileSchema), controller.updateReceptionistProfile);
router.get('/clinics', controller.receptionistClinics);
router.get('/patients', validate(receptionistPatientSearchSchema), controller.receptionistPatients);
router.post('/patients', validate(receptionistPatientCreateSchema), controller.registerReceptionistPatient);
router.post('/patients/link', validate(receptionistPatientLinkSchema), controller.linkReceptionistPatient);
router.patch('/patients/:patientId', validate(receptionistPatientUpdateSchema), controller.updateReceptionistPatient);
router.get('/doctors', validate(receptionistClinicQuerySchema), controller.receptionistDoctors);
router.get('/doctors/:doctorId/slots', validate(receptionistDoctorSlotsSchema), controller.receptionistDoctorSlots);
router.get('/appointments', validate(receptionistAppointmentListSchema), controller.receptionistAppointments);
router.post('/appointments', validate(receptionistCreateAppointmentSchema), controller.bookReceptionistAppointment);
router.get('/appointments/:appointmentId', validate(receptionistAppointmentIdSchema), controller.receptionistAppointment);
router.patch('/appointments/:appointmentId', validate(receptionistRescheduleSchema), controller.rescheduleReceptionistAppointment);
router.post('/appointments/:appointmentId/cancel', validate(receptionistAppointmentIdSchema), controller.cancelReceptionistAppointment);
router.patch('/appointments/:appointmentId/workflow', validate(receptionistWorkflowSchema), controller.updateReceptionistWorkflow);

export default router;
