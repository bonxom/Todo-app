import express from 'express';
import { createTask, getAllTasks, getTaskById, updateTask, startTask, finishTask, giveUpTask, deleteTask, getTodayDeadlines, getTaskByStatus, getTaskByCategory } from '../controllers/taskController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createTaskSchema, taskCategoryParamSchema, taskQuerySchema, taskStatusParamSchema, updateTaskSchema } from '../validations/taskValidation.js';
import { idParamSchema } from '../validations/commonValidation.js';
import { pagingQuerySchema } from '../validations/pagingValidation.js';

const router = express.Router();

router.post('/', protect, validate({ body: createTaskSchema }), createTask);
router.get('/', protect, validate({ query: taskQuerySchema }), getAllTasks);
router.get('/today-deadlines', protect, validate({ query: pagingQuerySchema }), getTodayDeadlines);
router.get('/status/:status', protect, validate({ params: taskStatusParamSchema, query: pagingQuerySchema }), getTaskByStatus);
router.get('/category/:categoryId', protect, validate({ params: taskCategoryParamSchema, query: pagingQuerySchema }), getTaskByCategory);
router.get('/:id', protect, validate({ params: idParamSchema }), getTaskById);
router.put('/:id', protect, validate({ params: idParamSchema, body: updateTaskSchema }), updateTask);
router.put('/:id/start', protect, validate({ params: idParamSchema }), startTask);
router.put('/:id/finish', protect, validate({ params: idParamSchema }), finishTask);
router.put('/:id/give-up', protect, validate({ params: idParamSchema }), giveUpTask);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteTask);

export default router;
