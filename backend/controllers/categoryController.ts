import { Request, Response, NextFunction } from 'express';
import { categoryService } from '../services/categoryService.js';

export const createCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await categoryService.create(
      req.validatedBody as Record<string, unknown>,
      req.user!._id
    );
    res.status(201).json({ message: 'Category created successfully', category });
  } catch (error) {
    next(error);
  }
};

export const getAllCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const categories = await categoryService.getAll(req.user!);
    res.status(200).json(categories);
  } catch (error) {
    next(error);
  }
};

export const getCategoryById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await categoryService.getById(
      req.params.id as string,
      req.user!
    );
    res.status(200).json(category);
  } catch (error) {
    next(error);
  }
};

export const updateCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const category = await categoryService.update(
      req.params.id as string,
      req.validatedBody as Record<string, unknown>,
      req.user!
    );
    res.status(200).json({ message: 'Category updated successfully', category });
  } catch (error) {
    next(error);
  }
};

export const deleteCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await categoryService.delete(req.params.id as string, req.user!);
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    next(error);
  }
};
