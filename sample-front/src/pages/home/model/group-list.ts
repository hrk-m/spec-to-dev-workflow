import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group } from "@/pages/home/model/group";

export const FETCH_LIMIT = 100;

type GroupListCacheEntry = {
  groups: Group[];
  total: number;
  fetchedOffset: number;
  lastBatchSize: number;
};

const groupListCache = new Map<string, GroupListCacheEntry>();
const GROUP_LIST_CACHE_KEY = "default";

export function clearGroupListCache() {
  groupListCache.clear();
}

export function prependGroupToGroupListCache(group: Group) {
  const cacheEntry = groupListCache.get(GROUP_LIST_CACHE_KEY) ?? null;

  if (!cacheEntry) {
    groupListCache.set(GROUP_LIST_CACHE_KEY, {
      groups: [group],
      total: 1,
      fetchedOffset: FETCH_LIMIT,
      lastBatchSize: 1,
    });
    return;
  }

  const filteredGroups = cacheEntry.groups.filter((cachedGroup) => cachedGroup.id !== group.id);
  groupListCache.set(GROUP_LIST_CACHE_KEY, {
    ...cacheEntry,
    groups: [group, ...filteredGroups],
    total: cacheEntry.total + 1,
  });
}

export function useGroupList() {
  const cachedEntry = groupListCache.get(GROUP_LIST_CACHE_KEY) ?? null;
  const [cachedGroups, setCachedGroups] = useState<Group[]>(() => cachedEntry?.groups ?? []);
  const cachedGroupsRef = useRef(cachedGroups);
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
    cachedGroupsRef.current = cachedGroups;
  }, [cachedGroups]);

  const doFetch = useCallback((offset: number, query: string, append: boolean) => {
    setIsLoading(true);
    setError(null);

    fetchGroups({ limit: FETCH_LIMIT, offset, q: query || undefined })
      .then((data) => {
        const nextGroups = append
          ? [
              ...cachedGroupsRef.current,
              ...data.groups.filter(
                (group) =>
                  !cachedGroupsRef.current.some((cachedGroup) => cachedGroup.id === group.id),
              ),
            ]
          : !query && cachedGroupsRef.current.length > 0
            ? (() => {
                const next = [...cachedGroupsRef.current];
                const limit = Math.min(next.length, data.groups.length);

                for (let index = 0; index < limit; index += 1) {
                  const nextGroup = data.groups[index];
                  if (nextGroup) {
                    next[index] = nextGroup;
                  }
                }

                return next;
              })()
            : data.groups;

        setCachedGroups(nextGroups);
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

  const doFetchMore = useCallback((offset: number, query: string) => {
    setIsFetchingMore(true);
    setFetchMoreError(null);

    fetchGroups({ limit: FETCH_LIMIT, offset, q: query || undefined })
      .then((data) => {
        const nextGroups = [
          ...cachedGroupsRef.current,
          ...data.groups.filter(
            (group) => !cachedGroupsRef.current.some((cachedGroup) => cachedGroup.id === group.id),
          ),
        ];
        setCachedGroups(nextGroups);
        setTotal(data.total);
        setFetchedOffset(offset + FETCH_LIMIT);
        setLastBatchSize(data.groups.length);
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
      const cacheEntry = groupListCache.get(GROUP_LIST_CACHE_KEY) ?? null;

      if (cacheEntry) {
        setCachedGroups(cacheEntry.groups);
        setTotal(cacheEntry.total);
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
      } else {
        setCachedGroups([]);
        setTotal(0);
        setFetchedOffset(0);
        setLastBatchSize(FETCH_LIMIT);
      }
    } else {
      setCachedGroups([]);
      setTotal(0);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    }
    setFetchMoreError(null);
    doFetch(0, debouncedQuery, false);
  }, [debouncedQuery, doFetch]);

  // IntersectionObserver for sentinel element
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

  const visibleGroups = cachedGroups;
  const effectiveTotal = debouncedQuery ? cachedGroups.length : total;

  const hasCachedGroups = cachedGroups.length > 0;
  const shouldShowLoading = isLoading && !hasCachedGroups;

  useEffect(() => {
    if (!debouncedQuery) {
      groupListCache.set(GROUP_LIST_CACHE_KEY, {
        groups: cachedGroups,
        total: effectiveTotal,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [cachedGroups, effectiveTotal, fetchedOffset, lastBatchSize, debouncedQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    groups: visibleGroups,
    total: effectiveTotal,
    searchQuery,
    error,
    isLoading: shouldShowLoading,
    isFetchingMore,
    fetchMoreError,
    sentinelRef,
    setSearchQuery: handleSearch,
    groupCountLabel: shouldShowLoading
      ? "Loading groups..."
      : effectiveTotal > 0
        ? `${String(effectiveTotal)} groups`
        : "No groups found",
  };
}
