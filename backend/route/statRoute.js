import express from 'express';
import { getCompletedTasksByDate, getStats } from '../controller/statController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.get('/completed-tasks', protect, getCompletedTasksByDate);
router.get('/', protect, getStats);

export default router;
