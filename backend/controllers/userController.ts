import type { Request, Response } from 'express';
import { userService } from '../services/userService.js';

export const createUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userService.create(req.validatedBody as Record<string, unknown>);
  res.status(201).json({ message: 'User created successfully', user });
};

export const getAllUsers = async (
  _req: Request,
  res: Response
): Promise<void> => {
  const users = await userService.getAll();
  res.status(200).json(users);
};

export const getUserById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userService.getById(req.validatedParams!.id);
  res.status(200).json(user);
};

export const updateUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  const user = await userService.update(
    req.validatedParams!.id,
    req.validatedBody as Record<string, unknown>
  );
  res.status(200).json({ message: 'User updated successfully', user });
};

export const deleteUser = async (
  req: Request,
  res: Response
): Promise<void> => {
  await userService.delete(req.validatedParams!.id);
  res.status(200).json({ message: 'User deleted successfully' });
};
