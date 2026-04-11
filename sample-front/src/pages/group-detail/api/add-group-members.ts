import type { UserSummary } from "@/pages/group-detail/model/group-detail";
import { apiFetch } from "@/shared/api";

export type AddGroupMembersParams = {
  groupId: number;
  userIds: number[];
};

export type AddGroupMembersResponse = {
  members: UserSummary[];
};

export function addGroupMembers(params: AddGroupMembersParams): Promise<AddGroupMembersResponse> {
  return apiFetch<AddGroupMembersResponse>(`/api/v1/groups/${String(params.groupId)}/members`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_ids: params.userIds }),
  });
}
