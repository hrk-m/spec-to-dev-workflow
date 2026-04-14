import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteGroupMembers } from "@/pages/group-detail/api/delete-group-members";
import * as sharedApi from "@/shared/api";

vi.mock("@/shared/api", () => ({
  apiFetch: vi.fn(),
}));

describe("deleteGroupMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DELETE リクエストを正しい URL とボディで呼び出す", async () => {
    vi.mocked(sharedApi.apiFetch).mockResolvedValueOnce(undefined);

    await deleteGroupMembers({ groupId: 1, userIds: [2] });

    expect(sharedApi.apiFetch).toHaveBeenCalledWith("/api/v1/groups/1/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: [2] }),
    });
  });

  it("複数の user_ids を含むボディで DELETE リクエストを送信する", async () => {
    vi.mocked(sharedApi.apiFetch).mockResolvedValueOnce(undefined);

    await deleteGroupMembers({ groupId: 3, userIds: [10, 20, 30] });

    expect(sharedApi.apiFetch).toHaveBeenCalledWith("/api/v1/groups/3/members", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: [10, 20, 30] }),
    });
  });

  it("apiFetch が例外をスローした場合は再スローする", async () => {
    vi.mocked(sharedApi.apiFetch).mockRejectedValueOnce(new Error("404 Not Found"));

    await expect(deleteGroupMembers({ groupId: 1, userIds: [999] })).rejects.toThrow(
      "404 Not Found",
    );
  });
});
