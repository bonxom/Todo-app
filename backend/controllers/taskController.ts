import type { Request, Response } from 'express';
import { taskService } from '../services/taskService.js';

export const createTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const task = await taskService.create(
    req.validatedBody as Record<string, unknown>,
    req.user!._id
  );
  res.status(201).json({ message: 'Task created successfully', task });
};

export const getAllTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const tasks = await taskService.getAll(
    req.user!,
    req.validatedQuery as Record<string, unknown>
  );
  res.status(200).json(tasks);
};

export const getTaskById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const task = await taskService.getById(req.validatedParams!.id, req.user!);
  res.status(200).json(task);
};

export const updateTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const task = await taskService.update(
    req.validatedParams!.id,
    req.validatedBody as Record<string, unknown>,
    req.user!
  );
  res.status(200).json({ message: 'Task updated successfully', task });
};

export const finishTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const task = await taskService.finish(req.validatedParams!.id, req.user!);
  res.status(200).json({ message: 'Task marked as completed', task });
};

export const startTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const task = await taskService.start(req.validatedParams!.id, req.user!);
  res.status(200).json({ message: 'Task started successfully', task });
};

export const giveUpTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  const task = await taskService.giveUp(req.validatedParams!.id, req.user!);
  res.status(200).json({ message: 'Task marked as given-up', task });
};

export const deleteTask = async (
  req: Request,
  res: Response
): Promise<void> => {
  await taskService.delete(req.validatedParams!.id, req.user!);
  res.status(200).json({ message: 'Task deleted successfully' });
};

export const getTodayDeadlines = async (
  req: Request,
  res: Response
): Promise<void> => {
  const tasks = await taskService.getTodayDeadlines(req.user!);
  res.status(200).json(tasks);
};

export const getTaskByStatus = async (
  req: Request,
  res: Response
): Promise<void> => {
  const tasks = await taskService.getByStatus(
    req.user!,
    req.validatedParams!.status
  );
  res.status(200).json(tasks);
};

export const getTaskByCategory = async (
  req: Request,
  res: Response
): Promise<void> => {
  const tasks = await taskService.getByCategory(
    req.user!,
    req.validatedParams!.categoryId
  );
  res.status(200).json(tasks);
};
