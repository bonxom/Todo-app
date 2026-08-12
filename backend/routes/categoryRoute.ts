import express from 'express';
import { createCategory, getAllCategories, getCategoryById, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { protect } from '../middlewares/auth.js';
import { validate } from '../middlewares/validate.js';
import { createCategorySchema, updateCategorySchema } from '../validations/categoryValidation.js';
import { idParamSchema } from '../validations/commonValidation.js';

const router = express.Router();

router.post('/', protect, validate({ body: createCategorySchema }), createCategory);
router.get('/', protect, getAllCategories);
router.get('/:id', protect, validate({ params: idParamSchema }), getCategoryById);
router.put('/:id', protect, validate({ params: idParamSchema, body: updateCategorySchema }), updateCategory);
router.delete('/:id', protect, validate({ params: idParamSchema }), deleteCategory);

export default router;
