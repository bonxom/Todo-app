/**
 * PagingParameter — Standardized pagination request types.
 *
 * Used by controllers/services to describe page navigation from the client.
 * `pageNo` is 1-based (from client); repositories convert to 0-based skip offset.
 */

export interface PagingParameter {
  /** Current page number (1-based, from client) */
  pageNo: number;
  /** Number of records per page */
  pageSize: number;
  /** Sort string: "field:asc" or "field:desc", multiple columns separated by "_" */
  sort?: string;
}

export interface ParsedSort {
  [field: string]: 1 | -1;
}

export const DEFAULT_PAGE_NO = 1;
export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
