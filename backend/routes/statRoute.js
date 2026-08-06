import express from 'express';
import { getCompletedTasksByDate, getStats } from '../controllers/statController.js';
import { protect } from '../middlewares/auth.js';

const router = express.Router();

router.get('/completed-tasks', protect, getCompletedTasksByDate);
router.get('/', protect, getStats);

export default router;
