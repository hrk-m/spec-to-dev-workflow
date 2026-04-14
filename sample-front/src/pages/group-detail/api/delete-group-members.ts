import { apiFetch } from "@/shared/api";

export type DeleteGroupMembersParams = {
  groupId: number;
  userIds: number[];
};

export function deleteGroupMembers(params: DeleteGroupMembersParams): Promise<void> {
  return apiFetch<void>(`/api/v1/groups/${String(params.groupId)}/members`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ user_ids: params.userIds }),
  });
}
