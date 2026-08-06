import { projectRepository } from '../repositories/projectRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../utils/errors.js';
import { PROJECT_STATUSES } from '../constants/projectStatus.js';
import { FINISHED_STATUSES } from '../constants/taskStatus.js';

const createEmptySummary = () => ({
  totalTasks: 0,
  finishedTasks: 0,
  pendingTasks: 0,
  inProgressTasks: 0,
  completedTasks: 0,
  givenUpTasks: 0,
  scheduledTasks: 0,
  canComplete: false,
  completionRate: 0,
});

const addCompletionRate = (summary) => {
  const { _id, ...rest } = summary;
  const total = rest.totalTasks || 0;
  const finished = (rest.completedTasks || 0) + (rest.givenUpTasks || 0);
  return {
    ...rest,
    finishedTasks: finished,
    canComplete: total > 0 && finished === total,
    completionRate: total > 0 ? Math.round((rest.completedTasks / total) * 100) : 0,
  };
};

const computeSummaryMap = async (projectIds) => {
  if (projectIds.length === 0) return new Map();

  const summaries = await taskRepository.aggregate([
    { $match: { projectId: { $in: projectIds } } },
    {
      $group: {
        _id: '$projectId',
        totalTasks: { $sum: 1 },
        pendingTasks: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] } },
        inProgressTasks: { $sum: { $cond: [{ $eq: ['$status', 'in-progress'] }, 1, 0] } },
        completedTasks: { $sum: { $cond: [{ $eq: ['$status', 'completed'] }, 1, 0] } },
        givenUpTasks: { $sum: { $cond: [{ $eq: ['$status', 'given-up'] }, 1, 0] } },
        scheduledTasks: { $sum: { $cond: [{ $ifNull: ['$dueDate', false] }, 1, 0] } },
      },
    },
  ]);

  return new Map(
    summaries.map((s) => [s._id.toString(), addCompletionRate(s)])
  );
};

const getSingleSummary = async (projectId) => {
  const map = await computeSummaryMap([projectId]);
  return map.get(projectId.toString()) || createEmptySummary();
};

const withSummary = (project, summary) => ({
  ...project.toObject(),
  summary,
});

const getOwnerId = (project) =>
  project.userId?._id?.toString?.() || project.userId?.toString?.() || null;

const canAccess = (project, user) =>
  user.role === 'ADMIN' || getOwnerId(project) === user._id.toString();

const normalizeColor = (color) => {
  if (color === undefined) return { value: undefined };
  if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color.trim())) {
    return { error: 'Project color must be a six-digit hex color' };
  }
  return { value: color.trim().toUpperCase() };
};

const getCompletionEligibility = async (projectId) => {
  const summary = await taskRepository.aggregate([
    { $match: { projectId } },
    {
      $group: {
        _id: '$projectId',
        totalTasks: { $sum: 1 },
        unfinishedTasks: {
          $sum: { $cond: [{ $in: ['$status', FINISHED_STATUSES] }, 0, 1] },
        },
      },
    },
  ]);

  const result = summary[0] || { totalTasks: 0, unfinishedTasks: 0 };
  return result.totalTasks > 0 && result.unfinishedTasks === 0;
};

export const projectService = {
  async create(data, userId) {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new ValidationError('Name is required');
    }

    const normalizedColor = normalizeColor(data.color);
    if (normalizedColor.error) throw new ValidationError(normalizedColor.error);

    const existing = await projectRepository.findByUserAndName(userId, data.name.trim());
    if (existing) throw new ValidationError('Project name already exists for this user');

    const project = await projectRepository.create({
      userId,
      name: data.name.trim(),
      description: data.description,
      color: normalizedColor.value,
    });

    return withSummary(project, createEmptySummary());
  },

  async getAll(user) {
    const projects = user.role === 'ADMIN'
      ? await projectRepository.findAllPopulated()
      : await projectRepository.findByUserPopulated(user._id);

    const summaryMap = await computeSummaryMap(projects.map((p) => p._id));

    return projects.map((project) =>
      withSummary(project, summaryMap.get(project._id.toString()) || createEmptySummary())
    );
  },

  async getById(id, user) {
    const project = await projectRepository.findByIdPopulated(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to access this project");

    const summary = await getSingleSummary(project._id);
    return withSummary(project, summary);
  },

  async update(id, data, user) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to update this project");

    const update = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new ValidationError('Project name cannot be empty');
      }
      update.name = data.name.trim();
    }

    if (data.description !== undefined) update.description = data.description;

    const normalizedColor = normalizeColor(data.color);
    if (normalizedColor.error) throw new ValidationError(normalizedColor.error);
    if (normalizedColor.value !== undefined) update.color = normalizedColor.value;

    if (data.status !== undefined) {
      if (!PROJECT_STATUSES.includes(data.status)) throw new ValidationError('Invalid project status');

      if (data.status === 'completed') {
        const eligible = await getCompletionEligibility(project._id);
        if (!eligible) {
          throw new ValidationError(
            'Project can only be completed when it has at least one task and every task is completed or given up'
          );
        }
      }

      update.status = data.status;
    }

    if (Object.keys(update).length === 0) {
      throw new ValidationError('No fields to update');
    }

    const updated = await projectRepository.updateByIdPopulated(id, update);
    const summary = await getSingleSummary(updated._id);
    return withSummary(updated, summary);
  },

  async delete(id, user) {
    const project = await projectRepository.findById(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to delete this project");

    await projectRepository.deleteById(id);
  },

  async getProjectTasks(id, user) {
    const project = await projectRepository.findByIdPopulated(id);
    if (!project) throw new NotFoundError('Project not found');
    if (!canAccess(project, user)) throw new ForbiddenError("You don't have permission to access this project");

    const tasks = await taskRepository.findPopulated(
      { projectId: project._id },
      { sort: { dueDate: 1, createdAt: -1 } }
    );

    const summary = await getSingleSummary(project._id);

    return { project: withSummary(project, summary), summary, tasks };
  },
};
