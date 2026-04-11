import { beforeEach, describe, expect, it, vi } from "vitest";

import { addGroupMembers } from "@/pages/group-detail/api/add-group-members";

vi.mock("@/shared/api", () => ({
  apiFetch: vi.fn(),
}));

describe("addGroupMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("POST リクエストを正しい URL とボディで呼び出す", async () => {
    const { apiFetch } = await import("@/shared/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({
      members: [{ id: 2, first_name: "花子", last_name: "鈴木" }],
    });

    await addGroupMembers({ groupId: 1, userIds: [2] });

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/groups/1/members", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_ids: [2] }),
    });
  });

  it("レスポンスの members を返す", async () => {
    const { apiFetch } = await import("@/shared/api");
    const mockResponse = {
      members: [
        { id: 2, first_name: "花子", last_name: "鈴木" },
        { id: 3, first_name: "次郎", last_name: "田中" },
      ],
    };
    vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

    const result = await addGroupMembers({ groupId: 1, userIds: [2, 3] });

    expect(result).toEqual(mockResponse);
  });
});
