import { useEffect, useState } from "react";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group, Pagination } from "@/pages/home/model/group";

const DEFAULT_LIMIT = 10;
const WIDE_LAYOUT_BREAKPOINT = 1024;

export function useGroupList() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
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

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError(null);

    fetchGroups({ search, page, limit: DEFAULT_LIMIT })
      .then((data) => {
        if (!isActive) {
          return;
        }

        setGroups((prev) => {
          if (page === 1) {
            return data.groups;
          }

          const nextGroups = data.groups.filter(
            (candidate) => !prev.some((group) => group.id === candidate.id),
          );

          return [...prev, ...nextGroups];
        });
        setPagination(data.pagination);
      })
      .catch((err: unknown) => {
        if (!isActive) {
          return;
        }

        setError(String(err));
        if (page === 1) {
          setGroups([]);
          setPagination(null);
        }
      })
      .finally(() => {
        if (!isActive) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [search, page]);

  const totalPages = pagination ? Math.ceil(pagination.total / pagination.limit) : 0;
  const hasNextPage = pagination ? page < totalPages : false;
  const isInitialLoading = isLoading && page === 1;
  const isLoadingMore = isLoading && page > 1;
  const groupCountLabel = pagination ? `${pagination.total} groups` : "Loading groups...";
  const visibleGroupCountLabel = pagination
    ? `Showing ${groups.length} of ${pagination.total} groups`
    : "Preparing your list...";

  return {
    groups,
    pagination,
    search,
    setSearch,
    page,
    setPage,
    loadNextPage: () => {
      if (isLoading || !hasNextPage) {
        return;
      }

      setPage((prev) => prev + 1);
    },
    error,
    isLoading,
    isInitialLoading,
    isLoadingMore,
    isWideLayout,
    totalPages,
    hasNextPage,
    groupCountLabel,
    visibleGroupCountLabel,
  };
}
