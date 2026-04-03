import { useEffect, useState } from "react";

import { fetchGroup } from "@/pages/group-detail/api/fetch-group";
import type { GroupDetail } from "@/pages/group-detail/model/group-detail";

export function useGroupDetail(groupId: number) {
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isActive = true;

    setIsLoading(true);
    setError(null);

    fetchGroup(groupId)
      .then((data) => {
        if (!isActive) return;
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
