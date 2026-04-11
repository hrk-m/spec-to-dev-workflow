import { useEffect, useState } from "react";

import { fetchGroup } from "@/pages/group-detail/api/fetch-group";
import type { GroupDetail } from "@/pages/group-detail/model/group-detail";

const groupDetailCache = new Map<number, GroupDetail>();

export function clearGroupDetailCache() {
  groupDetailCache.clear();
}

export function useGroupDetail(groupId: number) {
  const [group, setGroup] = useState<GroupDetail | null>(
    () => groupDetailCache.get(groupId) ?? null,
  );
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(() => !groupDetailCache.has(groupId));

  useEffect(() => {
    let isActive = true;

    const cachedGroup = groupDetailCache.get(groupId) ?? null;

    setGroup(cachedGroup);
    setError(null);
    setIsLoading(true);

    fetchGroup(groupId)
      .then((data) => {
        if (!isActive) return;
        groupDetailCache.set(groupId, data);
        setGroup(data);
      })
      .catch((err: unknown) => {
        if (!isActive) return;
        setError(String(err));
      })
      .finally(() => {
        if (!isActive) return;
        setIsLoading(false);
      });

    return () => {
      isActive = false;
    };
  }, [groupId]);

  return { group, error, isLoading };
}
