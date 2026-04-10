import { useCallback, useState } from "react";
import { useNavigate } from "react-router";

import { createGroup } from "@/pages/home/api/create-group";
import type { CreateGroupRequest } from "@/pages/home/model/group";
import { prependGroupToGroupListCache } from "@/pages/home/model/group-list";

const NAME_MAX_LENGTH = 100;

type ValidationError = string | null;

function validateName(name: string): ValidationError {
  const trimmed = name.trim();
  if (trimmed.length === 0) {
    return "Name is required";
  }
  if (trimmed.length > NAME_MAX_LENGTH) {
    return "Name must be 100 characters or less";
  }
  return null;
}

export function useCreateGroup() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);

  const submit = useCallback(
    async (params: CreateGroupRequest) => {
      const validationError = validateName(params.name);
      if (validationError) {
        setNameError(validationError);
        return;
      }

      setNameError(null);
      setError(null);
      setIsLoading(true);

      try {
        const group = await createGroup(params);
        prependGroupToGroupListCache(group);
        navigate(`/groups/${String(group.id)}`);
      } catch (err: unknown) {
        setError(String(err));
      } finally {
        setIsLoading(false);
      }
    },
    [navigate],
  );

  return {
    isLoading,
    error,
    nameError,
    submit,
    setNameError,
    setError,
  };
}
