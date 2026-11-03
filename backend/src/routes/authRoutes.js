import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import * as controller from '../controllers/authController.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import {
  emailSchema,
  changePasswordSchema,
  loginSchema,
  registerSchema,
  resetCodeSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.js';

const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: { message: 'Too many authentication attempts. Please try again later.' },
});

const router = Router();

router.get('/csrf', controller.csrf);
router.post('/register', authRateLimit, validate(registerSchema), controller.register);
router.post('/login', authRateLimit, validate(loginSchema), controller.login);
router.post('/logout', authenticate, controller.logout);
router.get('/me', authenticate, controller.me);
router.post('/change-password', authenticate, validate(changePasswordSchema), controller.changePassword);
router.post('/verify-email', authRateLimit, validate(verifyEmailSchema), controller.verifyEmail);
router.post('/resend-verification', authRateLimit, validate(emailSchema), controller.resendVerification);
router.post('/forgot-password', authRateLimit, validate(emailSchema), controller.forgotPassword);
router.post('/verify-reset-code', authRateLimit, validate(resetCodeSchema), controller.verifyResetCode);
router.post('/resend-reset-code', authRateLimit, validate(emailSchema), controller.resendResetCode);
router.post('/reset-password', authRateLimit, validate(resetPasswordSchema), controller.resetPassword);

export default router;
