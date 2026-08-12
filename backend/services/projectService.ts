import mongoose from 'mongoose';
import { projectRepository } from '../repositories/projectRepository.js';
import { taskRepository } from '../repositories/taskRepository.js';
import { AppError } from '../error/AppError.js';
import { COMMON_ERROR } from '../error/definitions/commonErrors.js';
import { PROJECT_ERROR } from '../error/definitions/projectErrors.js';
import { mapDatabaseError } from '../error/errorGuards.js';
import { PROJECT_STATUSES } from '../constants/projectStatus.js';
import { FINISHED_STATUSES } from '../constants/taskStatus.js';
import { IProjectDocument } from '../types/IProject.js';
import { IUserDocument } from '../types/IUser.js';

interface ProjectSummary {
  totalTasks: number;
  finishedTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  givenUpTasks: number;
  scheduledTasks: number;
  canComplete: boolean;
  completionRate: number;
}

interface ProjectWithSummary extends Record<string, unknown> {
  summary: ProjectSummary;
}

const createEmptySummary = (): ProjectSummary => ({
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

const addCompletionRate = (
  summary: Record<string, unknown> & { _id?: unknown }
): ProjectSummary => {
  const { _id, ...rest } = summary;
  const total = (rest.totalTasks as number) || 0;
  const finished = ((rest.completedTasks as number) || 0) + ((rest.givenUpTasks as number) || 0);
  return {
    totalTasks: total,
    finishedTasks: finished,
    pendingTasks: (rest.pendingTasks as number) || 0,
    inProgressTasks: (rest.inProgressTasks as number) || 0,
    completedTasks: (rest.completedTasks as number) || 0,
    givenUpTasks: (rest.givenUpTasks as number) || 0,
    scheduledTasks: (rest.scheduledTasks as number) || 0,
    canComplete: total > 0 && finished === total,
    completionRate: total > 0 ? Math.round(((rest.completedTasks as number) / total) * 100) : 0,
  };
};

const computeSummaryMap = async (
  projectIds: mongoose.Types.ObjectId[]
): Promise<Map<string, ProjectSummary>> => {
  if (projectIds.length === 0) return new Map();

  const summaries: Array<Record<string, unknown>> = await taskRepository.aggregate([
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
    summaries.map((s) => [String(s._id), addCompletionRate(s)])
  );
};

const getSingleSummary = async (
  projectId: mongoose.Types.ObjectId
): Promise<ProjectSummary> => {
  const map = await computeSummaryMap([projectId]);
  return map.get(projectId.toString()) || createEmptySummary();
};

const withSummary = (project: IProjectDocument, summary: ProjectSummary): ProjectWithSummary => ({
  ...project.toObject(),
  summary,
});

const getOwnerId = (project: IProjectDocument): string | null =>
  (project.userId as unknown as Record<string, unknown>)?._id?.toString?.()
  || project.userId?.toString?.()
  || null;

const canAccess = (project: IProjectDocument, user: IUserDocument): boolean =>
  user.role === 'ADMIN' || getOwnerId(project) === user._id.toString();

const normalizeColor = (
  color: unknown
): { value?: string; error?: string } => {
  if (color === undefined) return { value: undefined };
  if (typeof color !== 'string' || !/^#[0-9A-Fa-f]{6}$/.test(color.trim())) {
    return { error: 'Project color must be a six-digit hex color' };
  }
  return { value: color.trim().toUpperCase() };
};

const getCompletionEligibility = async (
  projectId: mongoose.Types.ObjectId
): Promise<boolean> => {
  const summary: Array<Record<string, unknown>> = await taskRepository.aggregate([
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
  return (result.totalTasks as number) > 0 && (result.unfinishedTasks as number) === 0;
};

export const projectService = {
  async create(
    data: Record<string, unknown>,
    userId: mongoose.Types.ObjectId | string
  ): Promise<ProjectWithSummary> {
    if (typeof data.name !== 'string' || !data.name.trim()) {
      throw new AppError(COMMON_ERROR.INVALID_PAYLOAD);
    }

    const normalizedColor = normalizeColor(data.color);
    if (normalizedColor.error) throw new AppError(COMMON_ERROR.INVALID_PAYLOAD);

    const existing = await projectRepository.findByUserAndName(userId, data.name.trim());
    if (existing) throw new AppError(PROJECT_ERROR.NAME_EXISTED);

    let project: IProjectDocument;
    try {
      project = await projectRepository.create({
        userId,
        name: data.name.trim(),
        description: data.description,
        color: normalizedColor.value,
      });
    } catch (error: unknown) {
      throw mapDatabaseError(error, PROJECT_ERROR.NAME_EXISTED);
    }

    return withSummary(project, createEmptySummary());
  },

  async getAll(user: IUserDocument): Promise<ProjectWithSummary[]> {
    const projects = user.role === 'ADMIN'
      ? await projectRepository.findAllPopulated()
      : await projectRepository.findByUserPopulated(user._id);

    const summaryMap = await computeSummaryMap(projects.map((p) => p._id));

    return projects.map((project) =>
      withSummary(project, summaryMap.get(project._id.toString()) || createEmptySummary())
    );
  },

  async getById(
    id: mongoose.Types.ObjectId | string,
    user: IUserDocument
  ): Promise<ProjectWithSummary> {
    const project = await projectRepository.findByIdPopulated(id);
    if (!project) throw new AppError(PROJECT_ERROR.NOT_FOUND);
    if (!canAccess(project, user))
      throw new AppError(PROJECT_ERROR.ACCESS_DENIED);

    const summary = await getSingleSummary(project._id);
    return withSummary(project, summary);
  },

  async update(
    id: mongoose.Types.ObjectId | string,
    data: Record<string, unknown>,
    user: IUserDocument
  ): Promise<ProjectWithSummary> {
    const project = await projectRepository.findById(id);
    if (!project) throw new AppError(PROJECT_ERROR.NOT_FOUND);
    if (!canAccess(project, user))
      throw new AppError(PROJECT_ERROR.ACCESS_DENIED);

    const update: Record<string, unknown> = {};

    if (data.name !== undefined) {
      if (typeof data.name !== 'string' || !data.name.trim()) {
        throw new AppError(COMMON_ERROR.INVALID_PAYLOAD);
      }
      update.name = data.name.trim();
    }

    if (data.description !== undefined) update.description = data.description;

    const normalizedColor = normalizeColor(data.color);
    if (normalizedColor.error) throw new AppError(COMMON_ERROR.INVALID_PAYLOAD);
    if (normalizedColor.value !== undefined) update.color = normalizedColor.value;

    if (data.status !== undefined) {
      if (!PROJECT_STATUSES.includes(data.status as string))
        throw new AppError(PROJECT_ERROR.STATUS_INVALID);

      if (data.status === 'completed') {
        if (project.status === 'completed') {
          throw new AppError(PROJECT_ERROR.ALREADY_COMPLETED);
        }
        const eligible = await getCompletionEligibility(project._id);
        if (!eligible) {
          throw new AppError(PROJECT_ERROR.CANNOT_BE_COMPLETED);
        }
      }

      update.status = data.status;
    }

    if (Object.keys(update).length === 0) {
      throw new AppError(PROJECT_ERROR.NO_FIELDS_TO_UPDATE);
    }

    let updated: IProjectDocument | null;
    try {
      updated = await projectRepository.updateByIdPopulated(id, update);
    } catch (error: unknown) {
      throw mapDatabaseError(error, PROJECT_ERROR.NAME_EXISTED);
    }
    if (!updated) throw new AppError(PROJECT_ERROR.NOT_FOUND);
    const summary = await getSingleSummary(updated._id);
    return withSummary(updated, summary);
  },

  async delete(
    id: mongoose.Types.ObjectId | string,
    user: IUserDocument
  ): Promise<void> {
    const project = await projectRepository.findById(id);
    if (!project) throw new AppError(PROJECT_ERROR.NOT_FOUND);
    if (!canAccess(project, user))
      throw new AppError(PROJECT_ERROR.ACCESS_DENIED);

    await projectRepository.deleteById(id);
  },

  async getProjectTasks(
    id: mongoose.Types.ObjectId | string,
    user: IUserDocument
  ): Promise<{ project: ProjectWithSummary; summary: ProjectSummary; tasks: unknown[] }> {
    const project = await projectRepository.findByIdPopulated(id);
    if (!project) throw new AppError(PROJECT_ERROR.NOT_FOUND);
    if (!canAccess(project, user))
      throw new AppError(PROJECT_ERROR.ACCESS_DENIED);

    const tasks = await taskRepository.findPopulated(
      { projectId: project._id },
      { sort: { dueDate: 1, createdAt: -1 } }
    );

    const summary = await getSingleSummary(project._id);

    return { project: withSummary(project, summary), summary, tasks };
  },
};
