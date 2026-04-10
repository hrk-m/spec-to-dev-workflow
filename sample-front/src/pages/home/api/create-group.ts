import type { CreateGroupRequest, CreateGroupResponse } from "@/pages/home/model/group";
import { apiFetch } from "@/shared/api";

export function createGroup(params: CreateGroupRequest): Promise<CreateGroupResponse> {
  return apiFetch<CreateGroupResponse>("/api/v1/groups", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params),
  });
}
