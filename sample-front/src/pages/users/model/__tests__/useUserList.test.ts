import { MockIntersectionObserver } from "@/test/setup";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchUsers } from "@/pages/users/api/fetch-users";
import { clearUserListCache, FETCH_LIMIT, useUserList } from "@/pages/users/model/user-list";

vi.mock("@/pages/users/api/fetch-users", () => ({
  fetchUsers: vi.fn(),
}));

describe("useUserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUserListCache();
    MockIntersectionObserver.reset();
  });

  it("初回表示で users と total をセットする", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: [
        {
          id: 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Taro",
          last_name: "Yamada",
        },
        {
          id: 2,
          uuid: "550e8400-e29b-41d4-a716-446655440002",
          first_name: "Hanako",
          last_name: "Sato",
        },
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
        users: [
          {
            id: 1,
            uuid: "550e8400-e29b-41d4-a716-446655440001",
            first_name: "Taro",
            last_name: "Yamada",
          },
        ],
        total: 1,
      })
      .mockResolvedValueOnce({
        users: [
          {
            id: 2,
            uuid: "550e8400-e29b-41d4-a716-446655440002",
            first_name: "Hanako",
            last_name: "Suzuki",
          },
        ],
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

  it("検索クエリは 300ms デバウンスされる", async () => {
    vi.useFakeTimers();

    vi.mocked(fetchUsers).mockResolvedValue({ users: [], total: 0 });

    const { result } = renderHook(() => useUserList());

    // 初回フェッチを完了させる
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    const callCountBeforeSearch = vi.mocked(fetchUsers).mock.calls.length;

    // searchQuery をセットするが、300ms 経過前はフェッチされない
    act(() => {
      result.current.setSearchQuery("Taro");
    });

    // 299ms 経過しても追加フェッチは発生しない
    act(() => {
      vi.advanceTimersByTime(299);
    });
    expect(vi.mocked(fetchUsers).mock.calls.length).toBe(callCountBeforeSearch);

    // 300ms 経過するとフェッチが発火する
    await act(async () => {
      vi.advanceTimersByTime(1);
      await vi.runAllTimersAsync();
    });

    expect(vi.mocked(fetchUsers).mock.calls.length).toBeGreaterThan(callCountBeforeSearch);
    expect(vi.mocked(fetchUsers)).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Taro" }));

    vi.useRealTimers();
  });

  it("0 件時は isEmptyResult が true になる", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.isEmptyResult).toBe(true);
    });
  });

  it("0 件かつローディング完了時は userCountLabel が 'No users found' になる", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    const { result } = renderHook(() => useUserList());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.userCountLabel).toBe("No users found");
  });

  it("初期マウント時に limit=100&offset=0 で呼び出す", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    renderHook(() => useUserList());

    await waitFor(() => {
      expect(vi.mocked(fetchUsers)).toHaveBeenCalledWith({
        limit: FETCH_LIMIT,
        offset: 0,
        q: undefined,
      });
    });
  });

  describe("無限スクロール", () => {
    it("users は cachedUsers の全件を返す", async () => {
      const users = Array.from({ length: 55 }, (_, i) => ({
        id: i + 1,
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      }));

      vi.mocked(fetchUsers).mockResolvedValueOnce({ users, total: 55 });

      const { result } = renderHook(() => useUserList());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(55);
      });
    });

    it("sentinel が visible になったら doFetchMore を呼ぶ（lastBatchSize === FETCH_LIMIT のとき）", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      }));
      const additionalUsers = [
        {
          id: FETCH_LIMIT + 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Extra",
          last_name: "User",
        },
      ];

      vi.mocked(fetchUsers)
        .mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT + 1 })
        .mockResolvedValueOnce({ users: additionalUsers, total: FETCH_LIMIT + 1 });

      const { result } = renderHook(() => useUserList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires
      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(vi.mocked(fetchUsers)).toHaveBeenCalledWith(
          expect.objectContaining({ offset: FETCH_LIMIT }),
        );
      });
    });

    it("sentinel が visible になった後に追加データが表示される", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      }));
      const additionalUsers = [
        {
          id: FETCH_LIMIT + 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Extra",
          last_name: "User",
        },
      ];

      vi.mocked(fetchUsers)
        .mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT + 1 })
        .mockResolvedValueOnce({ users: additionalUsers, total: FETCH_LIMIT + 1 });

      const { result } = renderHook(() => useUserList());

      await waitFor(() => {
        expect(result.current.users).toHaveLength(FETCH_LIMIT);
      });

      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.users).toHaveLength(FETCH_LIMIT + 1);
      });
    });

    it("sentinel が交差したとき isFetchingMore が true → false と推移する", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      }));
      const additionalUsers = [
        {
          id: FETCH_LIMIT + 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Extra",
          last_name: "User",
        },
      ];

      vi.mocked(fetchUsers)
        .mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT + 1 })
        .mockResolvedValueOnce({ users: additionalUsers, total: FETCH_LIMIT + 1 });

      const { result } = renderHook(() => useUserList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // isFetchingMore は初期状態で false
      expect(result.current.isFetchingMore).toBe(false);

      // sentinel をトリガーして doFetchMore を起動
      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      // フェッチ完了後 isFetchingMore は false に戻る
      await waitFor(() => {
        expect(result.current.isFetchingMore).toBe(false);
      });

      // 追加データが表示されていること（doFetchMore が呼ばれた証拠）
      expect(result.current.users).toHaveLength(FETCH_LIMIT + 1);
    });

    it("追加フェッチ失敗時は fetchMoreError が表示される（既存 users は維持）", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        uuid: "550e8400-e29b-41d4-a716-446655440001",
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      }));

      vi.mocked(fetchUsers)
        .mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT + 10 })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useUserList());

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires and fails
      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.fetchMoreError).toContain("Network error");
      });

      // Existing items should still be displayed
      expect(result.current.users.length).toBeGreaterThan(0);
    });
  });
});
