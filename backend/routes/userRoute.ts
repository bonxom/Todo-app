import express from 'express';
import { createUser, getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/userController.js';
import { protect, authorize } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createUserSchema, updateUserSchema } from '../validations/userValidation.js';
import { idParamSchema } from '../validations/commonValidation.js';

const router = express.Router();

router.post('/', protect, authorize('ADMIN'), validate({ body: createUserSchema }), createUser);
router.get('/', protect, authorize('ADMIN'), getAllUsers);
router.get('/:id', protect, authorize('ADMIN'), validate({ params: idParamSchema }), getUserById);
router.put('/:id', protect, authorize('ADMIN'), validate({ params: idParamSchema, body: updateUserSchema }), updateUser);
router.delete('/:id', protect, authorize('ADMIN'), validate({ params: idParamSchema }), deleteUser);

export default router;
