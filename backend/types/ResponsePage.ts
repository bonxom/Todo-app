/**
 * ResponsePage — Standardized paginated response wrapper.
 *
 * Every paginated endpoint returns this shape so frontend can rely
 * on a consistent contract for pageInfo + data.
 */

export interface PageInfo {
  /** Current page number (1-based) */
  pageNo: number;
  /** Number of records per page */
  pageSize: number;
  /** Total number of matching records across all pages */
  totalCount: number;
  /** Total number of pages (Math.ceil(totalCount / pageSize)) */
  totalPage: number;
}

export interface ResponsePage<T> {
  pageInfo: PageInfo;
  data: T[];
}
