import express from 'express';
import {
  registerUser,
  loginUser,
  refreshToken,
  getMe,
  changePassword,
  updateInfo,
  logoutUser,
  selfDelete,
} from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  refreshTokenSchema,
} from '../validations/authValidation.js';

const router = express.Router();

router.post('/logout', logoutUser);
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.post('/refresh', validate(refreshTokenSchema), refreshToken);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);
router.put('/update-info', protect, updateInfo);
router.delete('/self-delete', protect, selfDelete);

export default router;
