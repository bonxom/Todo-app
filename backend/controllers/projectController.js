import { projectService } from '../services/projectService.js';

export const createProject = async (req, res, next) => {
  try {
    const project = await projectService.create(req.validatedBody, req.user._id);
    res.status(201).json({ message: 'Project created successfully', project });
  } catch (error) {
    next(error);
  }
};

export const getAllProjects = async (req, res, next) => {
  try {
    const projects = await projectService.getAll(req.user);
    res.status(200).json(projects);
  } catch (error) {
    next(error);
  }
};

export const getProjectById = async (req, res, next) => {
  try {
    const project = await projectService.getById(req.params.id, req.user);
    res.status(200).json(project);
  } catch (error) {
    next(error);
  }
};

export const updateProject = async (req, res, next) => {
  try {
    const project = await projectService.update(req.params.id, req.validatedBody, req.user);
    res.status(200).json({ message: 'Project updated successfully', project });
  } catch (error) {
    next(error);
  }
};

export const deleteProject = async (req, res, next) => {
  try {
    await projectService.delete(req.params.id, req.user);
    res.status(200).json({
      message: 'Project deleted successfully. Related tasks were kept and unassigned from the project.',
    });
  } catch (error) {
    next(error);
  }
};

export const getProjectTasks = async (req, res, next) => {
  try {
    const result = await projectService.getProjectTasks(req.params.id, req.user);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};
