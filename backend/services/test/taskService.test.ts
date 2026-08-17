import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../error/AppError.js';
import { TASK_ERROR } from '../../error/definitions/taskErrors.js';
import { taskRepository } from '../../repositories/taskRepository.js';
import { categoryRepository } from '../../repositories/categoryRepository.js';
import { statService } from '../statService.js';
import { taskService } from '../taskService.js';
import type { IUserDocument } from '../../types/IUser.js';

describe('taskService.finish', () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    role: 'USER',
  } as IUserDocument;

  const taskId = new mongoose.Types.ObjectId();
  const categoryId = new mongoose.Types.ObjectId();

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('rejects finishing a task that is not in-progress (e.g. pending)', async () => {
    const mockTask = {
      _id: taskId,
      status: 'pending',
      categoryId: {
        _id: categoryId,
        name: 'Work',
        userId: { _id: userId },
      },
      save: vi.fn(),
    };

    vi.spyOn(taskRepository, 'findByIdPopulated').mockResolvedValue(mockTask as never);

    await expect(taskService.finish(taskId, mockUser)).rejects.toMatchObject({
      code: TASK_ERROR.CANNOT_FINISH.code,
      statusCode: 422,
    });
    expect(mockTask.save).not.toHaveBeenCalled();
  });

  it('rejects finishing a task that is completed with CANNOT_FINISH or ALREADY_COMPLETED', async () => {
    const mockTask = {
      _id: taskId,
      status: 'completed',
      categoryId: {
        _id: categoryId,
        name: 'Work',
        userId: { _id: userId },
      },
      save: vi.fn(),
    };

    vi.spyOn(taskRepository, 'findByIdPopulated').mockResolvedValue(mockTask as never);

    await expect(taskService.finish(taskId, mockUser)).rejects.toThrow(AppError);
    expect(mockTask.save).not.toHaveBeenCalled();
  });

  it('successfully finishes an in-progress task', async () => {
    const mockTask = {
      _id: taskId,
      status: 'in-progress',
      categoryId: {
        _id: categoryId,
        name: 'Work',
        userId: { _id: userId },
      },
      save: vi.fn().mockResolvedValue(true),
    };

    vi.spyOn(taskRepository, 'findByIdPopulated').mockResolvedValue(mockTask as never);
    vi.spyOn(statService, 'incrementCompleted').mockResolvedValue(undefined as never);

    const result = await taskService.finish(taskId, mockUser);

    expect(mockTask.status).toBe('completed');
    expect(mockTask.save).toHaveBeenCalled();
    expect(statService.incrementCompleted).toHaveBeenCalledWith(userId, categoryId, 'Work');
  });
});
