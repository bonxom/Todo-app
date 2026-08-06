import express from 'express';
import { createProject, deleteProject, getAllProjects, getProjectById, getProjectTasks, updateProject } from '../controllers/projectController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProjectSchema, updateProjectSchema } from '../validations/projectValidation.js';

const router = express.Router();

router.post('/', protect, validate(createProjectSchema), createProject);
router.get('/', protect, getAllProjects);
router.get('/:id/tasks', protect, getProjectTasks);
router.get('/:id', protect, getProjectById);
router.put('/:id', protect, validate(updateProjectSchema), updateProject);
router.delete('/:id', protect, deleteProject);

export default router;
