import { useCallback, useEffect, useState } from "react";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group } from "@/pages/home/model/group";

const FETCH_LIMIT = 500;
const DEFAULT_PER_PAGE = 20;
const WIDE_LAYOUT_BREAKPOINT = 1024;

type PerPage = 20 | 50 | 100;

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;

export function useGroupList() {
  const [cachedGroups, setCachedGroups] = useState<Group[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPage>(DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedOffset, setFetchedOffset] = useState(0);
  const [lastBatchSize, setLastBatchSize] = useState(FETCH_LIMIT);
  const [isWideLayout, setIsWideLayout] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= WIDE_LAYOUT_BREAKPOINT,
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleResize = () => {
      setIsWideLayout(window.innerWidth >= WIDE_LAYOUT_BREAKPOINT);
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const doFetch = useCallback((offset: number, query: string, append: boolean) => {
    setIsLoading(true);
    setError(null);

    fetchGroups({ limit: FETCH_LIMIT, offset, q: query || undefined })
      .then((data) => {
        setCachedGroups((prev) => {
          if (append) {
            const existingIds = new Set(prev.map((g) => g.id));
            const newGroups = data.groups.filter((g) => !existingIds.has(g.id));
            return [...prev, ...newGroups];
          }
          return data.groups;
        });
        setTotal(data.total);
        setFetchedOffset(offset + FETCH_LIMIT);
        setLastBatchSize(data.groups.length);
      })
      .catch((err: unknown) => {
        setError(String(err));
        setLastBatchSize(0);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCachedGroups([]);
    setCurrentPage(1);
    setFetchedOffset(0);
    setLastBatchSize(FETCH_LIMIT);
    doFetch(0, debouncedQuery, false);
  }, [debouncedQuery, doFetch]);

  const effectiveTotal = debouncedQuery ? cachedGroups.length : total;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  const needsMoreData = endIndex > cachedGroups.length && lastBatchSize === FETCH_LIMIT;

  useEffect(() => {
    if (needsMoreData && !isLoading) {
      doFetch(fetchedOffset, debouncedQuery, true);
    }
  }, [needsMoreData, isLoading, fetchedOffset, debouncedQuery, doFetch]);

  const visibleGroups = cachedGroups.slice(startIndex, endIndex);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: PerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  }, []);

  const groupCountLabel = isLoading
    ? "Loading groups..."
    : effectiveTotal > 0
      ? `${String(effectiveTotal)} groups`
      : "No groups found";

  const visibleGroupCountLabel = isLoading
    ? "Preparing your list..."
    : effectiveTotal > 0
      ? `Showing ${String(visibleGroups.length)} of ${String(effectiveTotal)} groups`
      : "";

  return {
    groups: visibleGroups,
    total: effectiveTotal,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading,
    isWideLayout,
    setCurrentPage,
    setPerPage: handlePerPageChange,
    setSearchQuery: handleSearch,
    groupCountLabel,
    visibleGroupCountLabel,
  };
}
