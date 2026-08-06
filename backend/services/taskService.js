import { taskRepository } from '../repositories/taskRepository.js';
import { categoryRepository } from '../repositories/categoryRepository.js';
import { projectRepository } from '../repositories/projectRepository.js';
import { statService } from './statService.js';
import { normalizeTaskDateInput } from '../utils/dateTime.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { TASK_STATUSES } from '../constants/taskStatus.js';

const resolveCategory = async (categoryId, userId) => {
  if (categoryId) {
    const category = await categoryRepository.findById(categoryId);
    if (!category || category.userId.toString() !== userId.toString()) {
      throw new ValidationError('Invalid categoryId');
    }
    return categoryId;
  }

  const uncategorized = await categoryRepository.findByUserAndName(userId, 'Uncategorized');
  if (!uncategorized) throw new ValidationError('Uncategorized category not found');
  return uncategorized._id;
};

const resolveProject = async (projectId, userId, currentProjectId = null) => {
  if (projectId === undefined) return { shouldUpdate: false };
  if (projectId === '' || projectId === null) return { shouldUpdate: true, value: null };

  const project = await projectRepository.findById(projectId);
  if (!project || project.userId.toString() !== userId.toString()) {
    throw new ValidationError('Invalid projectId');
  }

  const normalizedCurrent = currentProjectId?.toString?.() || null;
  const normalizedNext = project._id.toString();
  if (project.status === 'completed' && normalizedNext !== normalizedCurrent) {
    throw new ValidationError('Completed projects cannot be assigned to tasks');
  }

  return { shouldUpdate: true, value: project._id };
};

const buildTaskAccessQuery = async (user) => {
  if (user.role === 'ADMIN') return {};

  const [userCategories, userProjects] = await Promise.all([
    categoryRepository.findByUser(user._id),
    projectRepository.findByUser(user._id),
  ]);

  const clauses = [];
  if (userCategories.length > 0) {
    clauses.push({ categoryId: { $in: userCategories.map((c) => c._id) } });
  }
  if (userProjects.length > 0) {
    clauses.push({ projectId: { $in: userProjects.map((p) => p._id) } });
  }

  if (clauses.length === 0) return { _id: { $in: [] } };
  if (clauses.length === 1) return clauses[0];
  return { $or: clauses };
};

const parseDateRangeQuery = (queryParams) => {
  const { startDate, endDate } = queryParams;
  if (startDate === undefined && endDate === undefined) return {};

  if (!startDate || !endDate) {
    return { error: 'Both startDate and endDate are required for date range filtering' };
  }

  const parsedStart = new Date(startDate);
  const parsedEnd = new Date(endDate);

  if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
    return { error: 'Invalid date range' };
  }

  if (parsedStart > parsedEnd) {
    return { error: 'startDate must be before or equal to endDate' };
  }

  return { filter: { dueDate: { $gte: parsedStart, $lte: parsedEnd } } };
};

const applyCompletionTimestamp = (update, currentStatus) => {
  if (update.status === undefined) return;

  if (update.status === 'completed') {
    if (currentStatus !== 'completed') {
      update.completedAt = new Date();
    }
  } else if (currentStatus === 'completed') {
    update.completedAt = null;
  }
};

const getOwnerId = (task) => {
  const categoryOwner = task.categoryId?.userId?._id?.toString?.()
    || task.categoryId?.userId?.toString?.();
  if (categoryOwner) return categoryOwner;
  return task.projectId?.userId?._id?.toString?.()
    || task.projectId?.userId?.toString?.()
    || null;
};

const verifyOwnership = (task, user) => {
  if (user.role === 'ADMIN') return;
  if (getOwnerId(task) !== user._id.toString()) {
    throw new ForbiddenError("You don't have permission to access this task");
  }
};

export const taskService = {
  async create(data, userId) {
    const categoryId = await resolveCategory(data.categoryId, userId);
    const projectUpdate = await resolveProject(data.projectId, userId);

    const startDate = normalizeTaskDateInput(data.startDate);
    const dueDate = normalizeTaskDateInput(data.dueDate);

    if (startDate.error || dueDate.error) {
      throw new ValidationError(startDate.error || dueDate.error);
    }

    const task = await taskRepository.create({
      title: data.title,
      description: data.description,
      status: 'in-progress',
      priority: data.priority,
      categoryId,
      projectId: projectUpdate.shouldUpdate ? projectUpdate.value : null,
      startDate: startDate.shouldUpdate ? startDate.value : undefined,
      dueDate: dueDate.shouldUpdate ? dueDate.value : undefined,
    });

    await statService.incrementInProgress(userId);
    return taskRepository.findByIdPopulated(task._id);
  },

  async getAll(user, queryParams) {
    const query = await buildTaskAccessQuery(user);
    const dateRange = parseDateRangeQuery(queryParams);
    if (dateRange.error) throw new ValidationError(dateRange.error);

    return taskRepository.findPopulated({
      ...query,
      ...(dateRange.filter || {}),
    });
  },

  async getById(id, user) {
    const task = await taskRepository.findByIdPopulated(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);
    return task;
  },

  async update(id, data, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    const update = {};

    if (data.title !== undefined) update.title = data.title;
    if (data.description !== undefined) update.description = data.description;

    if (data.status !== undefined) {
      if (!TASK_STATUSES.includes(data.status)) throw new ValidationError('Invalid status');
      update.status = data.status;
    }

    if (data.priority !== undefined) update.priority = data.priority;

    if (data.categoryId !== undefined) {
      if (data.categoryId === 'uncategorized' || data.categoryId === '' || data.categoryId === null) {
        const uncategorized = await categoryRepository.findByUserAndName(user._id, 'Uncategorized');
        if (!uncategorized) throw new ValidationError('Uncategorized category not found');
        update.categoryId = uncategorized._id;
      } else {
        const newCategory = await categoryRepository.findById(data.categoryId);
        if (!newCategory || newCategory.userId.toString() !== user._id.toString()) {
          throw new ValidationError('Invalid categoryId');
        }
        update.categoryId = data.categoryId;
      }
    }

    const currentProjectId = task.projectId?._id || task.projectId || null;
    const projectUpdate = await resolveProject(data.projectId, user._id, currentProjectId);
    if (projectUpdate.error) throw new ValidationError(projectUpdate.error);
    if (projectUpdate.shouldUpdate) update.projectId = projectUpdate.value;

    const startDate = normalizeTaskDateInput(data.startDate);
    const dueDate = normalizeTaskDateInput(data.dueDate);
    if (startDate.error || dueDate.error) {
      throw new ValidationError(startDate.error || dueDate.error);
    }
    if (startDate.shouldUpdate) update.startDate = startDate.value;
    if (dueDate.shouldUpdate) update.dueDate = dueDate.value;

    applyCompletionTimestamp(update, task.status);

    if (Object.keys(update).length === 0) {
      throw new ValidationError('No fields to update');
    }

    return taskRepository.updateByIdPopulated(id, update);
  },

  async finish(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    if (task.status === 'completed') throw new ValidationError('Task is already completed');

    const currentDate = new Date();
    task.status = 'completed';
    task.completedAt = currentDate;
    task.isOverDue = task.dueDate && currentDate > task.dueDate;
    await task.save();

    const categoryName = task.categoryId?.name
      || (await categoryRepository.findById(task.categoryId?._id))?.name;

    if (task.categoryId?._id && categoryName) {
      await statService.incrementCompleted(user._id, task.categoryId._id, categoryName);
    }

    return taskRepository.findByIdPopulated(id);
  },

  async start(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    if (task.status !== 'pending') throw new ValidationError('Only pending tasks can be started');

    task.status = 'in-progress';
    await task.save();

    await statService.incrementStart(user._id);
    return taskRepository.findByIdPopulated(id);
  },

  async giveUp(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    if (task.status !== 'in-progress') throw new ValidationError('Only in-progress tasks can be given up');

    task.status = 'given-up';
    await task.save();

    const categoryName = task.categoryId?.name
      || (await categoryRepository.findById(task.categoryId?._id))?.name;

    if (task.categoryId?._id && categoryName) {
      await statService.incrementGivenUp(user._id, task.categoryId._id, categoryName);
    }

    return taskRepository.findByIdPopulated(id);
  },

  async delete(id, user) {
    const task = await taskRepository.findById(id);
    if (!task) throw new NotFoundError('Task not found');
    verifyOwnership(task, user);

    await taskRepository.deleteById(id);
  },

  async getTodayDeadlines(user) {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setDate(endOfDay.getDate() + 1);
    endOfDay.setHours(23, 59, 59, 999);

    const baseQuery = await buildTaskAccessQuery(user);

    return taskRepository.findPopulated({
      ...baseQuery,
      dueDate: { $gte: startOfDay, $lt: endOfDay },
      status: { $nin: ['completed', 'given-up'] },
    });
  },

  async getByStatus(user, status) {
    const baseQuery = await buildTaskAccessQuery(user);
    return taskRepository.findPopulated({ ...baseQuery, status });
  },

  async getByCategory(user, categoryId) {
    const baseQuery = await buildTaskAccessQuery(user);
    return taskRepository.findPopulated({ ...baseQuery, categoryId });
  },
};
