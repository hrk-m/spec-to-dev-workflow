import { useCallback, useEffect, useRef, useState } from "react";

import { fetchNonMembers } from "@/pages/group-detail/api/fetch-non-members";
import type { UserSummary } from "@/pages/group-detail/model/group-detail";

const FETCH_LIMIT = 500;
const DEFAULT_PER_PAGE = 20;

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;

type PerPage = 20 | 50 | 100;

type NonMemberListState = {
  users: UserSummary[];
  total: number;
  fetchedOffset: number;
  lastBatchSize: number;
};

const nonMemberListCache = new Map<number, NonMemberListState>();

export function clearNonMemberListCache() {
  nonMemberListCache.clear();
}

export function useNonMemberList(groupId: number) {
  const [cachedUsers, setCachedUsers] = useState<UserSummary[]>([]);
  const cachedUsersRef = useRef(cachedUsers);
  const [total, setTotal] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState<PerPage>(DEFAULT_PER_PAGE);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fetchedOffset, setFetchedOffset] = useState(0);
  const [lastBatchSize, setLastBatchSize] = useState(FETCH_LIMIT);

  useEffect(() => {
    cachedUsersRef.current = cachedUsers;
  }, [cachedUsers]);

  const doFetch = useCallback(
    (offset: number, query: string, append: boolean) => {
      setIsLoading(true);
      setError(null);

      fetchNonMembers({ groupId, limit: FETCH_LIMIT, offset, q: query || undefined })
        .then((data) => {
          const nextUsers = append
            ? [
                ...cachedUsersRef.current,
                ...data.users.filter(
                  (user) => !cachedUsersRef.current.some((cached) => cached.id === user.id),
                ),
              ]
            : data.users;

          setCachedUsers(nextUsers);
          setTotal(data.total);
          setFetchedOffset(offset + FETCH_LIMIT);
          setLastBatchSize(data.users.length);
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
    setCachedUsers([]);
    setTotal(0);
    setCurrentPage(1);
    setFetchedOffset(0);
    setLastBatchSize(FETCH_LIMIT);
    doFetch(0, debouncedQuery, false);
  }, [groupId, debouncedQuery, doFetch]);

  const effectiveTotal = debouncedQuery ? cachedUsers.length : total;
  const totalPages = Math.max(1, Math.ceil(effectiveTotal / perPage));

  const startIndex = (currentPage - 1) * perPage;
  const endIndex = startIndex + perPage;

  const needsMoreData = endIndex > cachedUsers.length && lastBatchSize === FETCH_LIMIT;

  useEffect(() => {
    if (needsMoreData && !isLoading) {
      doFetch(fetchedOffset, debouncedQuery, true);
    }
  }, [needsMoreData, isLoading, fetchedOffset, debouncedQuery, doFetch]);

  const visibleUsers = cachedUsers.slice(startIndex, endIndex);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handleSetPerPage = useCallback((newPerPage: PerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  }, []);

  return {
    users: visibleUsers,
    total: effectiveTotal,
    currentPage,
    totalPages,
    perPage,
    isLoading,
    error,
    searchQuery,
    setSearchQuery: handleSetSearchQuery,
    setCurrentPage,
    setPerPage: handleSetPerPage,
    lastBatchSize,
  };
}
