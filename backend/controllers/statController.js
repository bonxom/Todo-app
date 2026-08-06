import { statService } from '../services/statService.js';

export const getStats = async (req, res, next) => {
  try {
    const stats = await statService.getStats(req.user);
    res.status(200).json(stats);
  } catch (error) {
    next(error);
  }
};

export const getCompletedTasksByDate = async (req, res, next) => {
  try {
    const tasks = await statService.getCompletedTasksByDate(req.user, req.query.date);
    res.status(200).json({ date: req.query.date, tasks });
  } catch (error) {
    next(error);
  }
};
