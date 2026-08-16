/**
 * pagingValidation — Shared Zod schema for pagination query parameters.
 *
 * Use `.merge()` or `.extend()` to combine with domain-specific query schemas.
 * Uses `z.coerce.number()` because Express query params are always strings.
 */

import { z } from 'zod';
import { MAX_PAGE_SIZE } from '../types/PagingParameter.js';

export const pagingQuerySchema = z.object({
  pageNo: z.coerce
    .number()
    .int()
    .min(1, 'pageNo must be at least 1')
    .default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, 'pageSize must be at least 1')
    .max(MAX_PAGE_SIZE, `pageSize must not exceed ${MAX_PAGE_SIZE}`)
    .default(20),
  sort: z.string().max(200).optional(),
});

export type PagingQueryInput = z.infer<typeof pagingQuerySchema>;
