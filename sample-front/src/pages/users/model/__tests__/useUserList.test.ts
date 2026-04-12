import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchUsers } from "@/pages/users/api/fetch-users";
import { clearUserListCache, useUserList } from "@/pages/users/model/user-list";

vi.mock("@/pages/users/api/fetch-users", () => ({
  fetchUsers: vi.fn(),
}));

describe("useUserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUserListCache();
  });

  it("初回表示で users と total をセットする", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: [
        { id: 1, first_name: "Taro", last_name: "Yamada" },
        { id: 2, first_name: "Hanako", last_name: "Sato" },
      ],
      total: 2,
    });

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.users).toHaveLength(2);
    });

    expect(result.current.total).toBe(2);
    expect(result.current.userCountLabel).toBe("2 users");
  });

  it("検索入力で q を渡す", async () => {
    vi.mocked(fetchUsers)
      .mockResolvedValueOnce({
        users: [{ id: 1, first_name: "Taro", last_name: "Yamada" }],
        total: 1,
      })
      .mockResolvedValueOnce({
        users: [{ id: 2, first_name: "Hanako", last_name: "Suzuki" }],
        total: 1,
      });

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.users).toHaveLength(1);
    });

    result.current.setSearchQuery("Suz");

    await waitFor(() => {
      expect(vi.mocked(fetchUsers)).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Suz" }));
    });
  });

  it("ページ切り替えで visibleUserCountLabel が更新される", async () => {
    const users = Array.from({ length: 25 }, (_, i) => ({
      id: i + 1,
      first_name: `First${String(i + 1)}`,
      last_name: `Last${String(i + 1)}`,
    }));

    vi.mocked(fetchUsers).mockResolvedValueOnce({ users, total: 25 });

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.users).toHaveLength(20);
    });

    expect(result.current.visibleUserCountLabel).toBe("Showing 20 of 25 users");

    act(() => {
      result.current.setCurrentPage(2);
    });

    await waitFor(() => {
      expect(result.current.visibleUserCountLabel).toBe("Showing 5 of 25 users");
    });
  });

  it("0 件時は isEmptyResult が true になる", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.isEmptyResult).toBe(true);
    });
  });

  it("初期マウント時に limit=500&offset=0 で呼び出す", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    renderHook(() => useUserList());

    await waitFor(() => {
      expect(vi.mocked(fetchUsers)).toHaveBeenCalledWith({ limit: 500, offset: 0, q: undefined });
    });
  });
});
