import { useCallback, useEffect, useState } from "react";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { Member } from "@/pages/group-detail/model/group-detail";

const FETCH_LIMIT = 500;
const DEFAULT_PER_PAGE = 20;

type PerPage = 20 | 50 | 100;

export function useMemberList(groupId: number) {
  const [cachedMembers, setCachedMembers] = useState<Member[]>([]);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPage>(DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchedOffset, setFetchedOffset] = useState(0);
  const [lastBatchSize, setLastBatchSize] = useState(FETCH_LIMIT);

  const doFetch = useCallback(
    (offset: number, query: string, append: boolean) => {
      setIsLoading(true);
      setError(null);

      fetchGroupMembers({ groupId, limit: FETCH_LIMIT, offset, q: query || undefined })
        .then((data) => {
          setCachedMembers((prev) => {
            if (append) {
              const existingIds = new Set(prev.map((m) => m.id));
              const newMembers = data.members.filter((m) => !existingIds.has(m.id));
              return [...prev, ...newMembers];
            }
            return data.members;
          });
          setTotal(data.total);
          setFetchedOffset(offset + FETCH_LIMIT);
          setLastBatchSize(data.members.length);
        })
        .catch((err: unknown) => {
          setError(String(err));
          setLastBatchSize(0);
        })
        .finally(() => {
          setIsLoading(false);
        });
    },
    [groupId],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setCachedMembers([]);
    setCurrentPage(1);
    setFetchedOffset(0);
    setLastBatchSize(FETCH_LIMIT);
    doFetch(0, debouncedQuery, false);
  }, [groupId, debouncedQuery, doFetch]);

  const effectiveTotal = debouncedQuery ? cachedMembers.length : total;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  const needsMoreData = endIndex > cachedMembers.length && lastBatchSize === FETCH_LIMIT;

  useEffect(() => {
    if (needsMoreData && !isLoading) {
      doFetch(fetchedOffset, debouncedQuery, true);
    }
  }, [needsMoreData, isLoading, fetchedOffset, debouncedQuery, doFetch]);

  const visibleMembers = cachedMembers.slice(startIndex, endIndex);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: PerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  }, []);

  return {
    members: visibleMembers,
    total: effectiveTotal,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading,
    setCurrentPage,
    setPerPage: handlePerPageChange,
    setSearchQuery: handleSearch,
  };
}
