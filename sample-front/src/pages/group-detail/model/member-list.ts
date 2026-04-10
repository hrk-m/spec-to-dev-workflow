import { useCallback, useEffect, useRef, useState } from "react";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { Member } from "@/pages/group-detail/model/group-detail";

const FETCH_LIMIT = 500;
const DEFAULT_PER_PAGE = 20;

type PerPage = 20 | 50 | 100;

type MemberListCacheEntry = {
  members: Member[];
  total: number;
  currentPage: number;
  perPage: PerPage;
  fetchedOffset: number;
  lastBatchSize: number;
};

const memberListCache = new Map<number, MemberListCacheEntry>();

export function clearMemberListCache() {
  memberListCache.clear();
}

export function useMemberList(groupId: number) {
  const cachedEntry = memberListCache.get(groupId) ?? null;
  const [cachedMembers, setCachedMembers] = useState<Member[]>(() => cachedEntry?.members ?? []);
  const cachedMembersRef = useRef(cachedMembers);
  const [total, setTotal] = useState(() => cachedEntry?.total ?? 0);
  const [currentPage, setCurrentPage] = useState(() => cachedEntry?.currentPage ?? 1);
  const [perPage, setPerPage] = useState<PerPage>(() => cachedEntry?.perPage ?? DEFAULT_PER_PAGE);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !cachedEntry);
  const [fetchedOffset, setFetchedOffset] = useState(() => cachedEntry?.fetchedOffset ?? 0);
  const [lastBatchSize, setLastBatchSize] = useState(() => cachedEntry?.lastBatchSize ?? FETCH_LIMIT);

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
                  (member) => !cachedMembersRef.current.some((cachedMember) => cachedMember.id === member.id),
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
        setCurrentPage(cacheEntry.currentPage);
        setPerPage(cacheEntry.perPage);
        setFetchedOffset(cacheEntry.fetchedOffset);
        setLastBatchSize(cacheEntry.lastBatchSize);
      } else {
        setCachedMembers([]);
        setTotal(0);
        setCurrentPage(1);
        setPerPage(DEFAULT_PER_PAGE);
        setFetchedOffset(0);
        setLastBatchSize(FETCH_LIMIT);
      }
    } else {
      setCachedMembers([]);
      setTotal(0);
      setCurrentPage(1);
      setPerPage(DEFAULT_PER_PAGE);
      setFetchedOffset(0);
      setLastBatchSize(FETCH_LIMIT);
    }
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

  useEffect(() => {
    if (!debouncedQuery) {
      memberListCache.set(groupId, {
        members: cachedMembers,
        total,
        currentPage,
        perPage,
        fetchedOffset,
        lastBatchSize,
      });
    }
  }, [groupId, cachedMembers, total, currentPage, perPage, fetchedOffset, lastBatchSize, debouncedQuery]);

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
