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
  logoutSchema,
  updateInfoSchema,
} from '../validations/authValidation.js';

const router = express.Router();

router.post('/logout', validate({ body: logoutSchema }), logoutUser);
router.post('/register', validate({ body: registerSchema }), registerUser);
router.post('/login', validate({ body: loginSchema }), loginUser);
router.post('/refresh', validate({ body: refreshTokenSchema }), refreshToken);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate({ body: changePasswordSchema }), changePassword);
router.put('/update-info', protect, validate({ body: updateInfoSchema }), updateInfo);
router.delete('/self-delete', protect, selfDelete);

export default router;
