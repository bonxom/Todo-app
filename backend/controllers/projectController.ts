import { Request, Response, NextFunction } from 'express';
import { projectService } from '../services/projectService.js';

export const createProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = await projectService.create(
      req.validatedBody as Record<string, unknown>,
      req.user!._id
    );
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    next(error);
  }
};

export const getAllProjects = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const projects = await projectService.getAll(req.user!);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = await projectService.getById(
      req.params.id as string,
      req.user!
    );
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const project = await projectService.update(
      req.params.id as string,
      req.validatedBody as Record<string, unknown>,
      req.user!
    );
    res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    await projectService.delete(req.params.id as string, req.user!);
    res.status(200).json({
      message:
        'Project deleted successfully. Related tasks were kept and unassigned from the project.',
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectTasks = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const result = await projectService.getProjectTasks(
      req.params.id as string,
      req.user!
    );
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
