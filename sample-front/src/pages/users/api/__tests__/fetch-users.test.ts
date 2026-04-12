import { describe, expect, it, vi } from "vitest";

import { fetchUsers } from "@/pages/users/api/fetch-users";
import { apiFetch } from "@/shared/api";

vi.mock("@/shared/api", () => ({
  apiFetch: vi.fn(),
}));

describe("fetchUsers", () => {
  it("query を /api/v1/users に付与して呼び出す", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ users: [], total: 0 });

    await fetchUsers({ q: "Suzuki", limit: 20, offset: 40 });

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/users?q=Suzuki&limit=20&offset=40");
  });

  it("パラメータなしではベース URL を呼び出す", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ users: [], total: 0 });

    await fetchUsers({});

    expect(apiFetch).toHaveBeenCalledWith("/api/v1/users");
  });
});
