import { loginUser, getMe, changePassword, updateInfo } from '../controller/authController.js';
import { protect, authorize } from '../middleware/auth.js';
import express from 'express';

const router = express.Router();

router.post('/login', loginUser);
router.get('/me', protect, getMe);
router.put('/change-password', protect, changePassword);
router.put('/update-info', protect, updateInfo);

export default router;