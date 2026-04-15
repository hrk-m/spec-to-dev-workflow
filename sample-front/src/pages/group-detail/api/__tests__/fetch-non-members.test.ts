import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNonMembers } from "@/pages/group-detail/api/fetch-non-members";

vi.mock("@/shared/api", () => ({
  apiFetch: vi.fn(),
}));

describe("fetchNonMembers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("デフォルトパラメータで正しい URL を呼び出す", async () => {
    const { apiFetch } = await import("@/shared/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({ users: [], total: 0 });

    await fetchNonMembers({ groupId: 1 });

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/groups/1/non-members?limit=100&offset=0");
  });

  it("q パラメータを含む URL を呼び出す", async () => {
    const { apiFetch } = await import("@/shared/api");
    vi.mocked(apiFetch).mockResolvedValueOnce({ users: [], total: 0 });

    await fetchNonMembers({ groupId: 1, q: "山田", limit: 500, offset: 0 });

    expect(apiFetch).toHaveBeenCalledWith(
      "/api/v1/groups/1/non-members?limit=500&offset=0&q=%E5%B1%B1%E7%94%B0",
    );
  });

  it("レスポンスの users と total を返す", async () => {
    const { apiFetch } = await import("@/shared/api");
    const mockResponse = {
      users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
      total: 1,
    };
    vi.mocked(apiFetch).mockResolvedValueOnce(mockResponse);

    const result = await fetchNonMembers({ groupId: 1 });

    expect(result).toEqual(mockResponse);
  });
});
