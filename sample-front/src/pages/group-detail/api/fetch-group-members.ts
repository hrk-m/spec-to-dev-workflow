import type { MembersResponse } from "@/pages/group-detail/model/group-detail";
import { apiFetch } from "@/shared/api";

export type FetchGroupMembersParams = {
  groupId: number;
  limit: number;
  offset: number;
  q?: string;
};

export function fetchGroupMembers(params: FetchGroupMembersParams): Promise<MembersResponse> {
  const query = new URLSearchParams({
    limit: String(params.limit),
    offset: String(params.offset),
  });

  if (params.q) {
    query.set("q", params.q);
  }

  return apiFetch<MembersResponse>(
    `/api/v1/groups/${String(params.groupId)}/members?${query.toString()}`,
  );
}
