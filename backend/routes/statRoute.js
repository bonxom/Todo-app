import express from 'express';
import { getStats, getCompletedTasksByDate } from '../controllers/statController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/', protect, getStats);
router.get('/completed-tasks', protect, getCompletedTasksByDate);

export default router;
