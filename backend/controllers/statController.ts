import { Request, Response, NextFunction } from 'express';
import { statService } from '../services/statService.js';

export const getStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = await statService.getStats(req.user!);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const getCompletedTasksByDate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const tasks = await statService.getCompletedTasksByDate(
      req.user!,
      req.query.date as string
    );
    res.status(200).json({ date: req.query.date, tasks });
  } catch (error) {
    next(error);
  }
};
