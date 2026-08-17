import mongoose from 'mongoose';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AppError } from '../../error/AppError.js';
import { TASK_ERROR } from '../../error/definitions/taskErrors.js';
import { taskRepository } from '../../repositories/taskRepository.js';
import { categoryRepository } from '../../repositories/categoryRepository.js';
import { projectRepository } from '../../repositories/projectRepository.js';
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

describe('taskService paginated queries', () => {
  const userId = new mongoose.Types.ObjectId();
  const mockUser = {
    _id: userId,
    role: 'USER',
  } as IUserDocument;

  const mockTasks = [
    { _id: new mongoose.Types.ObjectId(), title: 'Task 1' },
    { _id: new mongoose.Types.ObjectId(), title: 'Task 2' },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
    vi.spyOn(categoryRepository, 'findByUser').mockResolvedValue([{ _id: new mongoose.Types.ObjectId() }] as never);
    vi.spyOn(projectRepository, 'findByUser').mockResolvedValue([] as never);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('getTodayDeadlines returns paginated ResponsePage', async () => {
    vi.spyOn(taskRepository, 'findPaginated').mockResolvedValue({
      data: mockTasks as never,
      totalCount: 2,
    });

    const result = await taskService.getTodayDeadlines(mockUser, { pageNo: 1, pageSize: 10 });

    expect(result).toHaveProperty('pageInfo');
    expect(result).toHaveProperty('data');
    expect(result.pageInfo).toEqual({
      pageNo: 1,
      pageSize: 10,
      totalCount: 2,
      totalPage: 1,
    });
    expect(result.data).toEqual(mockTasks);
    expect(taskRepository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        dueDate: expect.any(Object),
        status: { $nin: ['completed', 'given-up'] },
      }),
      expect.objectContaining({
        skip: 0,
        limit: 10,
      })
    );
  });

  it('getByStatus returns paginated ResponsePage', async () => {
    vi.spyOn(taskRepository, 'findPaginated').mockResolvedValue({
      data: mockTasks as never,
      totalCount: 2,
    });

    const result = await taskService.getByStatus(mockUser, 'in-progress', { pageNo: 2, pageSize: 5 });

    expect(result).toHaveProperty('pageInfo');
    expect(result.pageInfo).toEqual({
      pageNo: 2,
      pageSize: 5,
      totalCount: 2,
      totalPage: 1,
    });
    expect(taskRepository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'in-progress',
      }),
      expect.objectContaining({
        skip: 5,
        limit: 5,
      })
    );
  });

  it('getByCategory returns paginated ResponsePage', async () => {
    const catId = new mongoose.Types.ObjectId().toString();
    vi.spyOn(taskRepository, 'findPaginated').mockResolvedValue({
      data: mockTasks as never,
      totalCount: 2,
    });

    const result = await taskService.getByCategory(mockUser, catId, { pageNo: 1, pageSize: 20 });

    expect(result).toHaveProperty('pageInfo');
    expect(result.pageInfo).toEqual({
      pageNo: 1,
      pageSize: 20,
      totalCount: 2,
      totalPage: 1,
    });
    expect(taskRepository.findPaginated).toHaveBeenCalledWith(
      expect.objectContaining({
        categoryId: catId,
      }),
      expect.objectContaining({
        skip: 0,
        limit: 20,
      })
    );
  });
});
