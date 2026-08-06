import express from 'express';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, updateUserSchema } from '../validations/userValidation.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), validate(createUserSchema), createUser);
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.get('/:id', protect, authorize('ADMIN'), getUserById);
router.put('/:id', protect, authorize('ADMIN'), validate(updateUserSchema), updateUser);
router.delete('/:id', protect, authorize('ADMIN'), deleteUser);

export default router;
