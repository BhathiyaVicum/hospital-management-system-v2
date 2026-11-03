import { Router } from 'express';
import * as controller from '../controllers/supportController.js';
import { authenticate, requireRole, requireVerifiedEmail } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  createTicketMessageSchema,
  ticketIdSchema,
  ticketListSchema,
  updateTicketAssignmentSchema,
  updateTicketStatusSchema,
} from '../validators/support.js';

const router = Router();

router.use(authenticate, requireVerifiedEmail, requireRole('staff'));
router.get('/dashboard', controller.getStaffDashboard);
router.get('/staff', controller.listStaff);
router.get('/tickets', validate(ticketListSchema), controller.listStaffTickets);
router.get('/tickets/:ticketId', validate(ticketIdSchema), controller.getStaffTicket);
router.post('/tickets/:ticketId/messages', validate(createTicketMessageSchema), controller.replyAsStaff);
router.patch('/tickets/:ticketId/status', validate(updateTicketStatusSchema), controller.updateTicketStatus);
router.patch('/tickets/:ticketId/assignment', validate(updateTicketAssignmentSchema), controller.updateTicketAssignment);

export default router;
