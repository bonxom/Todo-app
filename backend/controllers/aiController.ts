import { Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService.js';

export const generateTasksWithRequirement = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.validatedBody as Record<string, unknown>;
    const tasks = await aiService.generateTasks(
      body.userRequirement as string,
      req.user!._id
    );
    res.status(201).json({
      success: true,
      message: '3 tasks generated successfully',
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const responseToUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const body = req.validatedBody as Record<string, unknown>;
    const content = await aiService.chatResponse(body.userInput as string);
    res.status(200).json({
      success: true,
      message: 'Response generated successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};
