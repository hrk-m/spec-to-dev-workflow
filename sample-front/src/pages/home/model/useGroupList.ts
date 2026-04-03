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
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedOffset, setFetchedOffset] = useState(0);
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
      })
      .catch((err: unknown) => {
        setError(String(err));
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    setCachedGroups([]);
    setCurrentPage(1);
    setFetchedOffset(0);
    doFetch(0, searchQuery, false);
  }, [searchQuery, doFetch]);

  const totalPages = Math.max(1, Math.ceil(total / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  const needsMoreData = endIndex > cachedGroups.length && cachedGroups.length < total;

  useEffect(() => {
    if (needsMoreData && !isLoading) {
      doFetch(fetchedOffset, searchQuery, true);
    }
  }, [needsMoreData, isLoading, fetchedOffset, searchQuery, doFetch]);

  const visibleGroups = cachedGroups.slice(startIndex, endIndex);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: PerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  }, []);

  const groupCountLabel = total > 0 ? `${String(total)} groups` : "Loading groups...";
  const visibleGroupCountLabel =
    total > 0
      ? `Showing ${String(visibleGroups.length)} of ${String(total)} groups`
      : "Preparing your list...";

  return {
    groups: visibleGroups,
    total,
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
