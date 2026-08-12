import type { Request, Response } from 'express';
import { statService } from '../services/statService.js';

export const getStats = async (
  req: Request,
  res: Response
): Promise<void> => {
  const stats = await statService.getStats(req.user!);
  res.status(200).json(stats);
};

export const getCompletedTasksByDate = async (
  req: Request,
  res: Response
): Promise<void> => {
  const tasks = await statService.getCompletedTasksByDate(
    req.user!,
    req.validatedQuery!.date as string
  );
  res.status(200).json({ date: req.validatedQuery!.date, tasks });
};
