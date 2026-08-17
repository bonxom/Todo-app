/**
 * pagingUtils — Shared utility functions for pagination.
 *
 * - parseSortString: converts "dueDate:asc_priority:desc" → { dueDate: 1, priority: -1 }
 * - calculateSkip: converts 1-based pageNo to 0-based skip offset
 * - buildResponsePage: assembles the final ResponsePage<T> envelope
 */

import type { ParsedSort } from '../types/PagingParameter.js';
import type { PageInfo, ResponsePage } from '../types/ResponsePage.js';

/**
 * Parse a sort string into a Mongoose-compatible sort object.
 *
 * Format: "field:asc" or "field:desc", multiple columns separated by "_"
 * Example: "dueDate:asc_priority:desc" → { dueDate: 1, priority: -1 }
 *
 * Invalid segments are silently skipped. If the entire string is invalid
 * or empty, falls back to the provided default sort.
 */
export const parseSortString = (
  sort: string | undefined,
  defaultSort: ParsedSort = { dueDate: 1, createdAt: -1 }
): ParsedSort => {
  if (!sort || typeof sort !== 'string' || sort.trim() === '') {
    return defaultSort;
  }

  const ALLOWED_DIRECTIONS: Record<string, 1 | -1> = { asc: 1, desc: -1 };

  // Guard against field names that could trigger MongoDB injection
  const FIELD_PATTERN = /^[a-zA-Z_][a-zA-Z0-9_.]*$/;

  const result: ParsedSort = {};

  const segments = sort.split('_');
  for (const segment of segments) {
    const colonIndex = segment.lastIndexOf(':');
    if (colonIndex === -1) continue;

    const field = segment.slice(0, colonIndex).trim();
    const direction = segment.slice(colonIndex + 1).trim().toLowerCase();

    if (!field || !FIELD_PATTERN.test(field)) continue;
    if (!(direction in ALLOWED_DIRECTIONS)) continue;

    result[field] = ALLOWED_DIRECTIONS[direction];
  }

  return Object.keys(result).length > 0 ? result : defaultSort;
};

/**
 * Convert 1-based pageNo and pageSize into a 0-based skip offset.
 */
export const calculateSkip = (pageNo: number, pageSize: number): number => {
  return (Math.max(1, pageNo) - 1) * pageSize;
};

/**
 * Build the standardized ResponsePage<T> envelope.
 */
export const buildResponsePage = <T>(
  data: T[],
  totalCount: number,
  pageNo: number,
  pageSize: number
): ResponsePage<T> => {
  const totalPage = pageSize > 0 ? Math.ceil(totalCount / pageSize) : 0;

  const pageInfo: PageInfo = {
    pageNo,
    pageSize,
    totalCount,
    totalPage,
  };

  return { pageInfo, data };
};
