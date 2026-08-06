import { z } from 'zod';
import { PROJECT_STATUSES } from '../constants/projectStatus.js';

export const createProjectSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a six-digit hex color').optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  color: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Color must be a six-digit hex color').optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
});
