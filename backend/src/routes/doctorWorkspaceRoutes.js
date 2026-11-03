import { Router } from 'express';
import * as controller from '../controllers/workspaceController.js';
import { authenticate, requireRole, requireVerifiedEmail } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  consultationSchema,
  doctorCalendarSchema,
  doctorDateScheduleSchema,
  doctorAppointmentListSchema,
  doctorExceptionIdSchema,
  doctorExceptionSchema,
  doctorExceptionUpdateSchema,
  doctorProfileSchema,
  doctorScheduleListSchema,
  doctorWeeklyScheduleSchema,
  doctorWeeklyScheduleUpdateSchema,
  doctorWorkflowSchema,
  workspaceAppointmentIdSchema,
} from '../validators/workspace.js';

const router = Router();
router.use(authenticate, requireVerifiedEmail, requireRole('doctor'));
router.get('/dashboard', controller.doctorDashboard);
router.get('/profile', controller.doctorProfile);
router.patch('/profile', validate(doctorProfileSchema), controller.updateDoctorProfile);
router.get('/appointments', validate(doctorAppointmentListSchema), controller.doctorAppointments);
router.get('/appointments/:appointmentId', validate(workspaceAppointmentIdSchema), controller.doctorAppointment);
router.patch('/appointments/:appointmentId/workflow', validate(doctorWorkflowSchema), controller.doctorWorkflow);
router.get('/appointments/:appointmentId/consultation', validate(workspaceAppointmentIdSchema), controller.doctorConsultation);
router.put('/appointments/:appointmentId/consultation', validate(consultationSchema), controller.saveDoctorConsultation);
router.get('/schedules', validate(doctorScheduleListSchema), controller.doctorSchedules);
router.get('/schedules/calendar', validate(doctorCalendarSchema), controller.doctorCalendar);
router.put('/schedules/dates/:date', validate(doctorDateScheduleSchema), controller.saveDoctorDateSchedule);
router.post('/schedules/weekly', validate(doctorWeeklyScheduleSchema), controller.createDoctorWeeklySchedule);
router.patch('/schedules/weekly/:availabilityId', validate(doctorWeeklyScheduleUpdateSchema), controller.updateDoctorWeeklySchedule);
router.post('/schedules/exceptions', validate(doctorExceptionSchema), controller.createDoctorException);
router.patch('/schedules/exceptions/:exceptionId', validate(doctorExceptionUpdateSchema), controller.updateDoctorException);
router.delete('/schedules/exceptions/:exceptionId', validate(doctorExceptionIdSchema), controller.deleteDoctorException);

export default router;
