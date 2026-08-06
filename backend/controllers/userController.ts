import { Request, Response, NextFunction } from 'express';
import { userService } from '../services/userService.js';

export const createUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.create(req.validatedBody as Record<string, unknown>);
    res.status(201).json({ message: 'User created successfully', user });
  } catch (error) {
    next(error);
  }
};

export const getAllUsers = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const users = await userService.getAll();
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
};

export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.getById(req.params.id as string);
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
};

export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await userService.update(
      req.params.id as string,
      req.validatedBody as Record<string, unknown>
    );
    res.status(200).json({ message: 'User updated successfully', user });
  } catch (error) {
    next(error);
  }
};

export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await userService.delete(req.params.id as string);
    res.status(200).json({ message: 'User deleted successfully' });
  } catch (error) {
    next(error);
  }
};
