import express from 'express';
import { getStats, getCompletedTasksByDate } from '../controllers/statController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { completedTasksQuerySchema } from '../validations/statValidation.js';

const router = express.Router();

router.get('/', protect, getStats);
router.get('/completed-tasks', protect, validate({ query: completedTasksQuerySchema }), getCompletedTasksByDate);

export default router;
