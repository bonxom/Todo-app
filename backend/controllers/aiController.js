import { aiService } from '../services/aiService.js';

export const generateTasksWithRequirement = async (req, res, next) => {
  try {
    const tasks = await aiService.generateTasks(req.validatedBody.userRequirement, req.user._id);
    res.status(201).json({
      success: true,
      message: '3 tasks generated successfully',
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

export const responseToUser = async (req, res, next) => {
  try {
    const content = await aiService.chatResponse(req.validatedBody.userInput);
    res.status(200).json({
      success: true,
      message: 'Response generated successfully',
      data: content,
    });
  } catch (error) {
    next(error);
  }
};
