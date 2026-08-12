import type { Request, Response } from 'express';
import { projectService } from '../services/projectService.js';

export const createProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  const project = await projectService.create(
    req.validatedBody as Record<string, unknown>,
    req.user!._id
  );
  res.status(201).json({ message: 'Project created successfully', project });
};

export const getAllProjects = async (
  req: Request,
  res: Response
): Promise<void> => {
  const projects = await projectService.getAll(req.user!);
  res.status(200).json(projects);
};

export const getProjectById = async (
  req: Request,
  res: Response
): Promise<void> => {
  const project = await projectService.getById(
    req.validatedParams!.id,
    req.user!
  );
  res.status(200).json(project);
};

export const updateProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  const project = await projectService.update(
    req.validatedParams!.id,
    req.validatedBody as Record<string, unknown>,
    req.user!
  );
  res.status(200).json({ message: 'Project updated successfully', project });
};

export const deleteProject = async (
  req: Request,
  res: Response
): Promise<void> => {
  await projectService.delete(req.validatedParams!.id, req.user!);
  res.status(200).json({
    message:
      'Project deleted successfully. Related tasks were kept and unassigned from the project.',
  });
};

export const getProjectTasks = async (
  req: Request,
  res: Response
): Promise<void> => {
  const result = await projectService.getProjectTasks(
    req.validatedParams!.id,
    req.user!
  );
  res.status(200).json(result);
};
