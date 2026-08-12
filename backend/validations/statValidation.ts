import { z } from 'zod';
import { DATE_KEY_PATTERN } from '../constants/datePatterns.js';

export const completedTasksQuerySchema = z.object({
  date: z.string().regex(DATE_KEY_PATTERN, 'A valid date in YYYY-MM-DD format is required'),
});
