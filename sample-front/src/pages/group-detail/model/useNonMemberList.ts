import { useCallback, useEffect, useRef, useState } from "react";

import { fetchNonMembers } from "@/pages/group-detail/api/fetch-non-members";
import type { UserSummary } from "@/pages/group-detail/model/group-detail";

export const FETCH_LIMIT = 100;

type NonMemberListState = {
  users: UserSummary[];
  total: number;
  fetchedOffset: number;
  lastBatchSize: number;
};

const nonMemberListCache = new Map<number, NonMemberListState>();

export function clearNonMemberListCache(groupId?: number): void {
  if (groupId !== undefined) {
    nonMemberListCache.delete(groupId);
  } else {
    nonMemberListCache.clear();
  }
}

export function useNonMemberList(groupId: number) {
  const cachedEntry = nonMemberListCache.get(groupId) ?? null;
  const [cachedUsers, setCachedUsers] = useState<UserSummary[]>(() => cachedEntry?.users ?? []);
  const cachedUsersRef = useRef(cachedUsers);
  const [total, setTotal] = useState(() => cachedEntry?.total ?? 0);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [fetchMoreError, setFetchMoreError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [fetchedOffset, setFetchedOffset] = useState(() => cachedEntry?.fetchedOffset ?? 0);
  const [lastBatchSize, setLastBatchSize] = useState(
    () => cachedEntry?.lastBatchSize ?? FETCH_LIMIT,
  );

  const sentinelRef = useRef<HTMLDivElement | null>(null);

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

  const doFetchMore = useCallback(
    (offset: number, query: string) => {
      setIsFetchingMore(true);
      setFetchMoreError(null);

      fetchNonMembers({ groupId, limit: FETCH_LIMIT, offset, q: query || undefined })
        .then((data) => {
          const nextUsers = [
            ...cachedUsersRef.current,
            ...data.users.filter(
              (user) => !cachedUsersRef.current.some((cached) => cached.id === user.id),
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
    if (!debouncedQuery) {
      const cacheEntry = nonMemberListCache.get(groupId) ?? null;

      if (cacheEntry) {
        setCachedUsers(cacheEntry.users);
        setTotal(cacheEntry.total);
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
        setFetchMoreError(null);
        return;
      }

      setCachedUsers([]);
      setTotal(0);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    } else {
      setCachedUsers([]);
      setTotal(0);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    }

    setFetchMoreError(null);
    doFetch(0, debouncedQuery, false);
  }, [groupId, debouncedQuery, doFetch]);

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

  useEffect(() => {
    if (!debouncedQuery) {
      nonMemberListCache.set(groupId, {
        users: cachedUsers,
        total,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [groupId, cachedUsers, total, fetchedOffset, lastBatchSize, debouncedQuery]);

  const handleSetSearchQuery = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    users: visibleUsers,
    total: effectiveTotal,
    isLoading,
    isFetchingMore,
    fetchMoreError,
    error,
    searchQuery,
    sentinelRef,
    setSearchQuery: handleSetSearchQuery,
    lastBatchSize,
  };
}
