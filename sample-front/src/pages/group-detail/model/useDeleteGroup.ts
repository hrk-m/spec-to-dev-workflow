import { useState } from "react";

import { deleteGroup } from "@/pages/group-detail/api/delete-group";

type UseDeleteGroupOptions = {
  onSuccess: () => void;
};

type UseDeleteGroupReturn = {
  isLoading: boolean;
  error: string | null;
  submit: (id: number) => Promise<void>;
};

export function useDeleteGroup({ onSuccess }: UseDeleteGroupOptions): UseDeleteGroupReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(id: number): Promise<void> {
    setIsLoading(true);
    setError(null);

    try {
      await deleteGroup(id);
      onSuccess();
    } catch (err: unknown) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  }

  return { isLoading, error, submit };
}
