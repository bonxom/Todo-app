import express from 'express';
import { generateTasksWithRequirement, responseToUser } from '../controllers/aiController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { generateTasksSchema, chatSchema } from '../validations/aiValidation.js';

const router = express.Router();

router.post('/generate-tasks', protect, validate({ body: generateTasksSchema }), generateTasksWithRequirement);
router.post('/chat', protect, validate({ body: chatSchema }), responseToUser);

export default router;
