import express from 'express';
import { createProject, deleteProject, getAllProjects, getProjectById, getProjectTasks, updateProject } from '../controllers/projectController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createProjectSchema, updateProjectSchema } from '../validations/projectValidation.js';
import { idParamSchema } from '../validations/commonValidation.js';

const router = express.Router();

router.post('/', protect, validate({ body: createProjectSchema }), createProject);
router.get('/', protect, getAllProjects);
router.get('/:id/tasks', protect, validate({ params: idParamSchema }), getProjectTasks);
router.get('/:id', protect, validate({ params: idParamSchema }), getProjectById);
router.put('/:id', protect, validate({ params: idParamSchema, body: updateProjectSchema }), updateProject);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteProject);

export default router;
