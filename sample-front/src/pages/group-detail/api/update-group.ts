import type { GroupDetail } from "@/pages/group-detail/model/group-detail";
import type { UpdateGroupRequest } from "@/pages/group-detail/model/group-update";
import { apiFetch } from "@/shared/api";

export function updateGroup(groupId: number, req: UpdateGroupRequest): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/api/v1/groups/${String(groupId)}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
}
