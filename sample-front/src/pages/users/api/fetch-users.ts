import type { FetchUsersParams, UsersResponse } from "@/pages/users/model/user";
import { apiFetch } from "@/shared/api";

export function fetchUsers(params: FetchUsersParams): Promise<UsersResponse> {
  const query = new URLSearchParams();

  if (params.q) {
    query.set("q", params.q);
  }
  if (params.limit !== undefined) {
    query.set("limit", String(params.limit));
  }
  if (params.offset !== undefined) {
    query.set("offset", String(params.offset));
  }

  const queryString = query.toString();
  const url = queryString ? `/api/v1/users?${queryString}` : "/api/v1/users";

  return apiFetch<UsersResponse>(url);
}
