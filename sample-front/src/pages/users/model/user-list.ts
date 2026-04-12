import { useCallback, useEffect, useRef, useState } from "react";

import { fetchUsers } from "@/pages/users/api/fetch-users";
import type { User } from "@/pages/users/model/user";

const FETCH_LIMIT = 500;
const DEFAULT_PER_PAGE = 20;

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;

type PerPage = 20 | 50 | 100;

type UserListCacheEntry = {
  users: User[];
  total: number;
  currentPage: number;
  perPage: PerPage;
  fetchedOffset: number;
  lastBatchSize: number;
};

const userListCache = new Map<string, UserListCacheEntry>();
const USER_LIST_CACHE_KEY = "default";

export function clearUserListCache() {
  userListCache.clear();
}

export function useUserList() {
  const cachedEntry = userListCache.get(USER_LIST_CACHE_KEY) ?? null;
  const [cachedUsers, setCachedUsers] = useState<User[]>(() => cachedEntry?.users ?? []);
  const cachedUsersRef = useRef(cachedUsers);
  const [total, setTotal] = useState(() => cachedEntry?.total ?? 0);
  const [currentPage, setCurrentPage] = useState(() => cachedEntry?.currentPage ?? 1);
  const [perPage, setPerPage] = useState<PerPage>(() => cachedEntry?.perPage ?? DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [fetchedOffset, setFetchedOffset] = useState(() => cachedEntry?.fetchedOffset ?? 0);
  const [lastBatchSize, setLastBatchSize] = useState(
    () => cachedEntry?.lastBatchSize ?? FETCH_LIMIT,
  );

  useEffect(() => {
    cachedUsersRef.current = cachedUsers;
  }, [cachedUsers]);

  const doFetch = useCallback((offset: number, query: string, append: boolean) => {
    setIsLoading(true);
    setError(null);

    fetchUsers({ limit: FETCH_LIMIT, offset, q: query || undefined })
      .then((data) => {
        const nextUsers = append
          ? [
              ...cachedUsersRef.current,
              ...data.users.filter(
                (user) => !cachedUsersRef.current.some((cachedUser) => cachedUser.id === user.id),
              ),
            ]
          : !query && cachedUsersRef.current.length > 0
            ? (() => {
                const next = [...cachedUsersRef.current];
                const limit = Math.min(next.length, data.users.length);

                for (let index = 0; index < limit; index += 1) {
                  const nextUser = data.users[index];
                  if (nextUser) {
                    next[index] = nextUser;
                  }
                }

                return next;
              })()
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
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    if (!debouncedQuery) {
      const cacheEntry = userListCache.get(USER_LIST_CACHE_KEY) ?? null;

      if (cacheEntry) {
        setCachedUsers(cacheEntry.users);
        setTotal(cacheEntry.total);
        setCurrentPage(cacheEntry.currentPage);
        setPerPage(cacheEntry.perPage);
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
      } else {
        setCachedUsers([]);
        setTotal(0);
        setCurrentPage(1);
        setPerPage(DEFAULT_PER_PAGE);
        setFetchedOffset(0);
        setLastBatchSize(FETCH_LIMIT);
      }
    } else {
      setCachedUsers([]);
      setTotal(0);
      setCurrentPage(1);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    }

    doFetch(0, debouncedQuery, false);
  }, [debouncedQuery, doFetch]);

  // Note: When no search query is active, we use `total` (unfiltered DB count)
  // rather than cachedUsers.length to allow navigation beyond the initial 500-item cache
  // (additional batches are auto-fetched per PRD req 14).
  // When searching, cachedUsers.length is used since total reflects the unfiltered count.
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

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    setCurrentPage(1);
  }, []);

  const handlePerPageChange = useCallback((newPerPage: PerPage) => {
    setPerPage(newPerPage);
    setCurrentPage(1);
  }, []);

  const hasCachedUsers = cachedUsers.length > 0;
  const shouldShowLoading = isLoading && !hasCachedUsers;

  const visibleUserCountLabel = shouldShowLoading
    ? "Loading users..."
    : effectiveTotal > 0
      ? `Showing ${String(visibleUsers.length)} of ${String(effectiveTotal)} users`
      : "";

  useEffect(() => {
    if (!debouncedQuery) {
      userListCache.set(USER_LIST_CACHE_KEY, {
        users: cachedUsers,
        total: effectiveTotal,
        currentPage,
        perPage,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [
    cachedUsers,
    effectiveTotal,
    currentPage,
    perPage,
    fetchedOffset,
    lastBatchSize,
    debouncedQuery,
  ]);

  const isEmptyResult = !isLoading && effectiveTotal === 0;

  return {
    users: visibleUsers,
    total: effectiveTotal,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading: shouldShowLoading,
    isEmptyResult,
    setCurrentPage,
    setPerPage: handlePerPageChange,
    setSearchQuery: handleSearch,
    userCountLabel: shouldShowLoading
      ? "Loading users..."
      : effectiveTotal > 0
        ? `${String(effectiveTotal)} users`
        : "No users found",
    visibleUserCountLabel,
  };
}
