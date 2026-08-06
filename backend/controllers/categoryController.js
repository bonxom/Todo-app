import { categoryService } from '../services/categoryService.js';

export const createCategory = async (req, res, next) => {
  try {
    const category = await categoryService.create(req.validatedBody, req.user._id);
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (req, res, next) => {
  try {
    const categories = await categoryService.getAll(req.user);
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (req, res, next) => {
  try {
    const category = await categoryService.getById(req.params.id, req.user);
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (req, res, next) => {
  try {
    const category = await categoryService.update(req.params.id, req.validatedBody, req.user);
    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (req, res, next) => {
  try {
    await categoryService.delete(req.params.id, req.user);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
