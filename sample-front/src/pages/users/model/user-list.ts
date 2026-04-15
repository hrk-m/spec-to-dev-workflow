import { useCallback, useEffect, useRef, useState } from "react";

import { fetchUsers } from "@/pages/users/api/fetch-users";
import type { User } from "@/pages/users/model/user";

export const FETCH_LIMIT = 100;

type UserListCacheEntry = {
  users: User[];
  total: number;
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
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [fetchMoreError, setFetchMoreError] = useState<string | null>(null);
  const [fetchedOffset, setFetchedOffset] = useState(() => cachedEntry?.fetchedOffset ?? 0);
  const [lastBatchSize, setLastBatchSize] = useState(
    () => cachedEntry?.lastBatchSize ?? FETCH_LIMIT,
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const doFetchMore = useCallback((offset: number, query: string) => {
    setIsFetchingMore(true);
    setFetchMoreError(null);

    fetchUsers({ limit: FETCH_LIMIT, offset, q: query || undefined })
      .then((data) => {
        const nextUsers = [
          ...cachedUsersRef.current,
          ...data.users.filter(
            (user) => !cachedUsersRef.current.some((cachedUser) => cachedUser.id === user.id),
          ),
        ];
        setCachedUsers(nextUsers);
        setTotal(data.total);
        setFetchedOffset(offset + FETCH_LIMIT);
        setLastBatchSize(data.users.length);
      })
      .catch((err: unknown) => {
        setFetchMoreError(String(err));
        setLastBatchSize(0);
      })
      .finally(() => {
        setIsFetchingMore(false);
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
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
      } else {
        setCachedUsers([]);
        setTotal(0);
        setFetchedOffset(0);
        setLastBatchSize(FETCH_LIMIT);
      }
    } else {
      setCachedUsers([]);
      setTotal(0);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    }

    setFetchMoreError(null);
    doFetch(0, debouncedQuery, false);
  }, [debouncedQuery, doFetch]);

  // Refs to avoid stale closures in IntersectionObserver callback
  const isFetchingMoreRef = useRef(isFetchingMore);
  const isLoadingRef = useRef(isLoading);
  const lastBatchSizeRef = useRef(lastBatchSize);
  const fetchedOffsetRef = useRef(fetchedOffset);
  const debouncedQueryRef = useRef(debouncedQuery);

  useEffect(() => {
    isFetchingMoreRef.current = isFetchingMore;
  }, [isFetchingMore]);
  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);
  useEffect(() => {
    lastBatchSizeRef.current = lastBatchSize;
  }, [lastBatchSize]);
  useEffect(() => {
    fetchedOffsetRef.current = fetchedOffset;
  }, [fetchedOffset]);
  useEffect(() => {
    debouncedQueryRef.current = debouncedQuery;
  }, [debouncedQuery]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry?.isIntersecting) return;
        if (isLoadingRef.current || isFetchingMoreRef.current) return;

        if (lastBatchSizeRef.current === FETCH_LIMIT) {
          doFetchMore(fetchedOffsetRef.current, debouncedQueryRef.current);
        }
      },
      { threshold: 0.1 },
    );

    const sentinel = sentinelRef.current;
    if (sentinel) {
      observer.observe(sentinel);
    }

    return () => observer.disconnect();
  }, [doFetchMore]);

  const visibleUsers = cachedUsers;
  const effectiveTotal = debouncedQuery ? cachedUsers.length : total;

  const hasCachedUsers = cachedUsers.length > 0;
  const shouldShowLoading = isLoading && !hasCachedUsers;
  const isEmptyResult = !isLoading && effectiveTotal === 0;

  useEffect(() => {
    if (!debouncedQuery) {
      userListCache.set(USER_LIST_CACHE_KEY, {
        users: cachedUsers,
        total: effectiveTotal,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [cachedUsers, effectiveTotal, fetchedOffset, lastBatchSize, debouncedQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    users: visibleUsers,
    total: effectiveTotal,
    searchQuery,
    error,
    isLoading: shouldShowLoading,
    isFetchingMore,
    fetchMoreError,
    isEmptyResult,
    sentinelRef,
    setSearchQuery: handleSearch,
    userCountLabel: shouldShowLoading
      ? "Loading users..."
      : effectiveTotal === 0
        ? "No users found"
        : `${String(effectiveTotal)} users`,
  };
}
