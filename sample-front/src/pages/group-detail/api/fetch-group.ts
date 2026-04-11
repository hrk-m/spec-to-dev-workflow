import type { GroupDetail } from "@/pages/group-detail/model/group-detail";
import { apiFetch } from "@/shared/api";

export function fetchGroup(groupId: number): Promise<GroupDetail> {
  return apiFetch<GroupDetail>(`/api/v1/groups/${String(groupId)}`);
}
