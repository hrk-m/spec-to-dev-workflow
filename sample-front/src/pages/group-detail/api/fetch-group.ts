import type { GroupDetail } from "@/pages/group-detail/model/group-detail";
import { apiFetch } from "@/shared/api/client";

export function fetchGroup(groupId: number): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/api/v1/groups/${String(groupId)}`);
}
