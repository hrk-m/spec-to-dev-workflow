import { apiFetch } from "@/shared/api/client";
import type { GroupSearchParams, GroupsResponse } from "@/pages/home/model/group";

export function fetchGroups(params: GroupSearchParams): Promise<GroupsResponse> {
  const query = new URLSearchParams({
    search: params.search,
    page: String(params.page),
    limit: String(params.limit),
  });

  return apiFetch<GroupsResponse>(`/api/v1/groups?${query.toString()}`);
}
