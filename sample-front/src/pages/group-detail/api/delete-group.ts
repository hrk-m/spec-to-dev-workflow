import { apiFetch } from "@/shared/api";

export function deleteGroup(id: number): Promise<void> {
  return apiFetch<void>(`/api/v1/groups/${String(id)}`, {
    method: "DELETE",
  });
}
