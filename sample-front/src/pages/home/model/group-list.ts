import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group } from "@/pages/home/model/group";

const FETCH_LIMIT = 500;
const DEFAULT_PER_PAGE = 20;
const WIDE_LAYOUT_BREAKPOINT = 1024;

type PerPage = 20 | 50 | 100;

export const PER_PAGE_OPTIONS = [20, 50, 100] as const;

type GroupListCacheEntry = {
  groups: Group[];
  total: number;
  currentPage: number;
  perPage: PerPage;
  fetchedOffset: number;
  lastBatchSize: number;
};

const groupListCache = new Map<string, GroupListCacheEntry>();
const GROUP_LIST_CACHE_KEY = "default";

export function clearGroupListCache() {
  groupListCache.clear();
}

export function prependGroupToGroupListCache(group: Group) {
  const cacheEntry = groupListCache.get(GROUP_LIST_CACHE_KEY);

  if (!cacheEntry) {
    groupListCache.set(GROUP_LIST_CACHE_KEY, {
      groups: [group],
      total: 1,
      currentPage: 1,
      perPage: DEFAULT_PER_PAGE,
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
  const [currentPage, setCurrentPage] = useState(() => cachedEntry?.currentPage ?? 1);
  const [perPage, setPerPage] = useState<PerPage>(() => cachedEntry?.perPage ?? DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [fetchedOffset, setFetchedOffset] = useState(() => cachedEntry?.fetchedOffset ?? 0);
  const [lastBatchSize, setLastBatchSize] = useState(() => cachedEntry?.lastBatchSize ?? FETCH_LIMIT);
  const [isWideLayout, setIsWideLayout] = useState(
    () => typeof window !== "undefined" && window.innerWidth >= WIDE_LAYOUT_BREAKPOINT,
  );

  useEffect(() => {
    cachedGroupsRef.current = cachedGroups;
  }, [cachedGroups]);

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
        const nextGroups = append
          ? [
              ...cachedGroupsRef.current,
              ...data.groups.filter(
                (group) => !cachedGroupsRef.current.some((cachedGroup) => cachedGroup.id === group.id),
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
        setCurrentPage(cacheEntry.currentPage);
        setPerPage(cacheEntry.perPage);
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
      } else {
        setCachedGroups([]);
        setTotal(0);
        setCurrentPage(1);
        setPerPage(DEFAULT_PER_PAGE);
        setFetchedOffset(0);
        setLastBatchSize(FETCH_LIMIT);
      }
    } else {
      setCachedGroups([]);
      setTotal(0);
      setCurrentPage(1);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    }
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

  const hasCachedGroups = cachedGroups.length > 0;
  const shouldShowLoading = isLoading && !hasCachedGroups;

  const visibleGroupCountLabel = shouldShowLoading
    ? "Loading groups..."
    : effectiveTotal > 0
      ? `Showing ${String(visibleGroups.length)} of ${String(effectiveTotal)} groups`
      : "";

  useEffect(() => {
    if (!debouncedQuery) {
      groupListCache.set(GROUP_LIST_CACHE_KEY, {
        groups: cachedGroups,
        total: effectiveTotal,
        currentPage,
        perPage,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [cachedGroups, effectiveTotal, currentPage, perPage, fetchedOffset, lastBatchSize, debouncedQuery]);

  return {
    groups: visibleGroups,
    total: effectiveTotal,
    currentPage,
    totalPages,
    perPage,
    searchQuery,
    error,
    isLoading: shouldShowLoading,
    isWideLayout,
    setCurrentPage,
    setPerPage: handlePerPageChange,
    setSearchQuery: handleSearch,
    groupCountLabel: shouldShowLoading
      ? "Loading groups..."
      : effectiveTotal > 0
        ? `${String(effectiveTotal)} groups`
        : "No groups found",
    visibleGroupCountLabel,
  };
}
