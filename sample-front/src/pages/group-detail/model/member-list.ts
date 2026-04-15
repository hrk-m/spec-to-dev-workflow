import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { UserSummary } from "@/pages/group-detail/model/group-detail";

export const FETCH_LIMIT = 100;

type MemberListCacheEntry = {
  members: UserSummary[];
  total: number;
  fetchedOffset: number;
  lastBatchSize: number;
};

const memberListCache = new Map<number, MemberListCacheEntry>();

export function clearMemberListCache() {
  memberListCache.clear();
}

export function useMemberList(groupId: number) {
  const cachedEntry = memberListCache.get(groupId) ?? null;
  const [cachedMembers, setCachedMembers] = useState<UserSummary[]>(
    () => cachedEntry?.members ?? [],
  );
  const cachedMembersRef = useRef(cachedMembers);
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
    cachedMembersRef.current = cachedMembers;
  }, [cachedMembers]);

  const doFetch = useCallback(
    (offset: number, query: string, append: boolean) => {
      setIsLoading(true);
      setError(null);

      fetchGroupMembers({ groupId, limit: FETCH_LIMIT, offset, q: query || undefined })
        .then((data) => {
          const nextMembers = append
            ? [
                ...cachedMembersRef.current,
                ...data.members.filter(
                  (member) =>
                    !cachedMembersRef.current.some((cachedMember) => cachedMember.id === member.id),
                ),
              ]
            : !query && cachedMembersRef.current.length > 0
              ? (() => {
                  const next = [...cachedMembersRef.current];
                  const limit = Math.min(next.length, data.members.length);

                  for (let index = 0; index < limit; index += 1) {
                    const nextMember = data.members[index];
                    if (nextMember) {
                      next[index] = nextMember;
                    }
                  }

                  return next;
                })()
              : data.members;

          setCachedMembers(nextMembers);
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

  const doFetchMore = useCallback(
    (offset: number, query: string) => {
      setIsFetchingMore(true);
      setFetchMoreError(null);

      fetchGroupMembers({ groupId, limit: FETCH_LIMIT, offset, q: query || undefined })
        .then((data) => {
          const nextMembers = [
            ...cachedMembersRef.current,
            ...data.members.filter(
              (member) =>
                !cachedMembersRef.current.some((cachedMember) => cachedMember.id === member.id),
            ),
          ];
          setCachedMembers(nextMembers);
          setTotal(data.total);
          setFetchedOffset(offset + FETCH_LIMIT);
          setLastBatchSize(data.members.length);
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
      const cacheEntry = memberListCache.get(groupId) ?? null;

      if (cacheEntry) {
        setCachedMembers(cacheEntry.members);
        setTotal(cacheEntry.total);
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
      } else {
        setCachedMembers([]);
        setTotal(0);
        setFetchedOffset(0);
        setLastBatchSize(FETCH_LIMIT);
      }
    } else {
      setCachedMembers([]);
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

  const visibleMembers = cachedMembers;
  const effectiveTotal = debouncedQuery ? cachedMembers.length : total;

  useEffect(() => {
    if (!debouncedQuery) {
      memberListCache.set(groupId, {
        members: cachedMembers,
        total,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [groupId, cachedMembers, total, fetchedOffset, lastBatchSize, debouncedQuery]);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  return {
    members: visibleMembers,
    total: effectiveTotal,
    searchQuery,
    error,
    isLoading,
    isFetchingMore,
    fetchMoreError,
    sentinelRef,
    setSearchQuery: handleSearch,
  };
}
