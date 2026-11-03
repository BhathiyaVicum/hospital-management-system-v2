import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/supportController.js';
import { authenticate, requireRole, requireVerifiedEmail } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  createTicketMessageSchema,
  createTicketSchema,
  ticketIdSchema,
  ticketListSchema,
} from '../validators/support.js';

const router = Router();
const supportLimit = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many support requests. Please try again later.' },
});

router.use(authenticate, requireVerifiedEmail, requireRole('patient'));
router.get('/tickets', validate(ticketListSchema), controller.listPatientTickets);
router.post('/tickets', supportLimit, validate(createTicketSchema), controller.createPatientTicket);
router.get('/tickets/:ticketId', validate(ticketIdSchema), controller.getPatientTicket);
router.post('/tickets/:ticketId/messages', supportLimit, validate(createTicketMessageSchema), controller.replyAsPatient);

export default router;
