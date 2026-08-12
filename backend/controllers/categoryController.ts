import type { Request, Response } from 'express';
import { categoryService } from '../services/categoryService.js';

export const createCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const category = await categoryService.create(
    req.validatedBody as Record<string, unknown>,
    req.user!._id
  );
  res.status(201).json({ message: 'Category created successfully', category });
};

export const getAllCategories = async (
  req: Request,
  res: Response
): Promise<void> => {
  const categories = await categoryService.getAll(req.user!);
  res.status(200).json(categories);
};

export const getCategoryById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const category = await categoryService.getById(
    req.validatedParams!.id,
    req.user!
  );
  res.status(200).json(category);
};

export const updateCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const category = await categoryService.update(
    req.validatedParams!.id,
    req.validatedBody as Record<string, unknown>,
    req.user!
  );
  res.status(200).json({ message: 'Category updated successfully', category });
};

export const deleteCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  await categoryService.delete(req.validatedParams!.id, req.user!);
  res.status(200).json({ message: 'Category deleted successfully' });
};
