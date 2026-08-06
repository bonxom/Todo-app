import { Request, Response, NextFunction } from 'express';
import { taskService } from '../services/taskService.js';

export const createTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await taskService.create(
      req.validatedBody as Record<string, unknown>,
      req.user!._id
    );
    res.status(201).json({ message: 'Task created successfully', task });
  } catch (error) {
    next(error);
  }
};

export const getAllTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await taskService.getAll(
      req.user!,
      req.query as Record<string, unknown>
    );
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await taskService.getById(req.params.id as string, req.user!);
    res.status(200).json(task);
  } catch (error) {
    next(error);
  }
};

export const updateTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await taskService.update(
      req.params.id as string,
      req.validatedBody as Record<string, unknown>,
      req.user!
    );
    res.status(200).json({ message: 'Task updated successfully', task });
  } catch (error) {
    next(error);
  }
};

export const finishTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await taskService.finish(req.params.id as string, req.user!);
    res.status(200).json({ message: 'Task marked as completed', task });
  } catch (error) {
    next(error);
  }
};

export const startTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await taskService.start(req.params.id as string, req.user!);
    res.status(200).json({ message: 'Task started successfully', task });
  } catch (error) {
    next(error);
  }
};

export const giveUpTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const task = await taskService.giveUp(req.params.id as string, req.user!);
    res.status(200).json({ message: 'Task marked as given-up', task });
  } catch (error) {
    next(error);
  }
};

export const deleteTask = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await taskService.delete(req.params.id as string, req.user!);
    res.status(200).json({ message: 'Task deleted successfully' });
  } catch (error) {
    next(error);
  }
};

export const getTodayDeadlines = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await taskService.getTodayDeadlines(req.user!);
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskByStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await taskService.getByStatus(
      req.user!,
      req.params.status as string
    );
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};

export const getTaskByCategory = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await taskService.getByCategory(
      req.user!,
      req.params.categoryId as string
    );
    res.status(200).json(tasks);
  } catch (error) {
    next(error);
  }
};
