import express from 'express';
import { registerUser, loginUser, getMe, changePassword, updateInfo, logoutUser, selfDelete } from '../controllers/authController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { registerSchema, loginSchema, changePasswordSchema } from '../validations/authValidation.js';

const router = express.Router();

router.post('/logout', logoutUser);
router.post('/register', validate(registerSchema), registerUser);
router.post('/login', validate(loginSchema), loginUser);
router.get('/me', protect, getMe);
router.put('/change-password', protect, validate(changePasswordSchema), changePassword);
router.put('/update-info', protect, updateInfo);
router.delete('/self-delete', protect, selfDelete);

export default router;
