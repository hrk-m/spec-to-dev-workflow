import { useState } from "react";

import { updateGroup } from "@/pages/group-detail/api/update-group";
import type { UpdateGroupRequest } from "@/pages/group-detail/model/group-update";

type UseUpdateGroupReturn = {
  isLoading: boolean;
  error: string | null;
  submit: (req: UpdateGroupRequest) => Promise<void>;
};

export function useUpdateGroup(groupId: number, onSuccess?: () => void): UseUpdateGroupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(req: UpdateGroupRequest): Promise<void> {
    const trimmedName = req.name.trim();

    if (trimmedName.length === 0) {
      setError("Name is required");
      return;
    }

    if (trimmedName.length > 100) {
      setError("Name must be 100 characters or less");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await updateGroup(groupId, { name: trimmedName, description: req.description });
      onSuccess?.();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, error, submit };
}
