import express from 'express';
import { createTask, getAllTasks, getTaskById, updateTask, startTask, finishTask, giveUpTask, deleteTask, getTodayDeadlines, getTaskByStatus, getTaskByCategory } from '../controllers/taskController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createTaskSchema, updateTaskSchema } from '../validations/taskValidation.js';

const router = express.Router();

router.post('/', protect, validate(createTaskSchema), createTask);
router.get('/', protect, getAllTasks);
router.get('/today-deadlines', protect, getTodayDeadlines);
router.get('/status/:status', protect, getTaskByStatus);
router.get('/category/:categoryId', protect, getTaskByCategory);
router.get('/:id', protect, getTaskById);
router.put('/:id', protect, validate(updateTaskSchema), updateTask);
router.put('/:id/start', protect, startTask);
router.put('/:id/finish', protect, finishTask);
router.put('/:id/give-up', protect, giveUpTask);
router.delete('/:id', protect, deleteTask);

export default router;
