/**
 * usePagination — Custom hook for managing pagination state.
 *
 * Features:
 * - Tracks pageNo, pageSize, totalCount, totalPage
 * - Auto-resets to page 1 when resetDeps change (e.g. search/filter changes)
 * - syncPageInfo() to hydrate totalCount/totalPage from server response
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { PageInfo } from '../types/domain';

interface UsePaginationOptions {
  initialPageNo?: number;
  initialPageSize?: number;
  /** When any value in this array changes, pageNo auto-resets to 1 */
  resetDeps?: unknown[];
}

interface UsePaginationReturn {
  pageNo: number;
  pageSize: number;
  setPageNo: (page: number) => void;
  setPageSize: (size: number) => void;
  /** Sync totalCount/totalPage from server response */
  syncPageInfo: (info: PageInfo) => void;
  totalCount: number;
  totalPage: number;
}

export function usePagination(options: UsePaginationOptions = {}): UsePaginationReturn {
  const {
    initialPageNo = 1,
    initialPageSize = 20,
    resetDeps = [],
  } = options;

  const [pageNo, setPageNo] = useState(initialPageNo);
  const [pageSize, setPageSizeState] = useState(initialPageSize);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPage, setTotalPage] = useState(0);

  // Track whether this is the first render to avoid resetting on mount
  const isFirstRender = useRef(true);
  const prevDepsRef = useRef(resetDeps);

  // Auto-reset to page 1 when resetDeps change
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    // Shallow compare deps
    const changed = resetDeps.some(
      (dep, i) => dep !== prevDepsRef.current[i]
    );

    if (changed) {
      setPageNo(1);
    }

    prevDepsRef.current = resetDeps;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, resetDeps);

  const setPageSize = useCallback((size: number) => {
    setPageSizeState(size);
    setPageNo(1); // Always reset to page 1 when page size changes
  }, []);

  const syncPageInfo = useCallback((info: PageInfo) => {
    setTotalCount(info.totalCount);
    setTotalPage(info.totalPage);
  }, []);

  return {
    pageNo,
    pageSize,
    setPageNo,
    setPageSize,
    syncPageInfo,
    totalCount,
    totalPage,
  };
}
