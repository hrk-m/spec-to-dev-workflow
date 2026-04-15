import { MockIntersectionObserver } from "@/test/setup";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNonMembers } from "@/pages/group-detail/api/fetch-non-members";
import {
  clearNonMemberListCache,
  FETCH_LIMIT,
  useNonMemberList,
} from "@/pages/group-detail/model/useNonMemberList";

vi.mock("@/pages/group-detail/api/fetch-non-members", () => ({
  fetchNonMembers: vi.fn(),
}));

describe("useNonMemberList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearNonMemberListCache();
    MockIntersectionObserver.reset();
  });

  it("マウント時に API を呼び出し users と total をセットする", async () => {
    const mockUsers = [{ id: 1, first_name: "太郎", last_name: "山田" }];
    vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: mockUsers, total: 1 });

    const { result } = renderHook(() => useNonMemberList(1));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.users).toEqual(mockUsers);
    expect(result.current.total).toBe(1);
    expect(fetchNonMembers).toHaveBeenCalledWith({
      groupId: 1,
      limit: FETCH_LIMIT,
      offset: 0,
    });
  });

  it("API エラー時に error をセットする", async () => {
    vi.mocked(fetchNonMembers).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useNonMemberList(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain("Network error");
    expect(result.current.users).toEqual([]);
  });

  it("検索クエリを 300ms デバウンスしてから API を呼び出す", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(fetchNonMembers).mockResolvedValue({ users: [], total: 0 });

    const { result } = renderHook(() => useNonMemberList(1));

    // 初回マウント時の fetch を完了させる
    await act(() => {
      vi.runAllTimers();
    });

    vi.clearAllMocks();

    // 検索クエリをセット
    act(() => {
      result.current.setSearchQuery("山田");
    });

    // デバウンス前は呼ばれない
    expect(fetchNonMembers).not.toHaveBeenCalled();

    // 300ms 経過させる
    await act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fetchNonMembers).toHaveBeenCalledWith(expect.objectContaining({ q: "山田", offset: 0 }));

    vi.useRealTimers();
  });

  it("同一 groupId で 2 回マウントしたとき 2 回目はキャッシュから読みロード不要になる", async () => {
    const mockUsers = [{ id: 1, first_name: "太郎", last_name: "山田" }];
    vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: mockUsers, total: 1 });

    // 1 回目マウント → API が呼ばれる
    const { unmount } = renderHook(() => useNonMemberList(1));

    await waitFor(() => {
      expect(vi.mocked(fetchNonMembers)).toHaveBeenCalledTimes(1);
    });

    unmount();
    vi.clearAllMocks();

    // 2 回目マウント → キャッシュから読むので isLoading が false のまま、API 呼ばれない
    const { result } = renderHook(() => useNonMemberList(1));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.users).toEqual(mockUsers);
    expect(vi.mocked(fetchNonMembers)).not.toHaveBeenCalled();
  });

  it("初期ローディング状態が true である", () => {
    vi.mocked(fetchNonMembers).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNonMemberList(1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  describe("無限スクロール", () => {
    it("users は cachedUsers の全件を返す", async () => {
      const mockUsers = Array.from({ length: 55 }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: mockUsers, total: 55 });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toHaveLength(55);
      expect(result.current.users[0]?.id).toBe(1);
    });

    it("sentinel が visible になったら doFetchMore を呼ぶ（lastBatchSize === FETCH_LIMIT のとき）", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      const additionalUsers = Array.from({ length: 10 }, (_, i) => ({
        id: FETCH_LIMIT + i + 1,
        first_name: `名${FETCH_LIMIT + i + 1}`,
        last_name: `姓${FETCH_LIMIT + i + 1}`,
      }));

      vi.mocked(fetchNonMembers)
        .mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT + 10 })
        .mockResolvedValueOnce({ users: additionalUsers, total: FETCH_LIMIT + 10 });

      const { result } = renderHook(() => useNonMemberList(1));

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
        expect(vi.mocked(fetchNonMembers)).toHaveBeenCalledWith(
          expect.objectContaining({ offset: FETCH_LIMIT }),
        );
      });
    });

    it("sentinel が visible になった後に追加データが表示される", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      const additionalUsers = Array.from({ length: 10 }, (_, i) => ({
        id: FETCH_LIMIT + i + 1,
        first_name: `名${FETCH_LIMIT + i + 1}`,
        last_name: `姓${FETCH_LIMIT + i + 1}`,
      }));

      vi.mocked(fetchNonMembers)
        .mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT + 10 })
        .mockResolvedValueOnce({ users: additionalUsers, total: FETCH_LIMIT + 10 });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.users).toHaveLength(FETCH_LIMIT);
      });

      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.users).toHaveLength(FETCH_LIMIT + 10);
      });
    });

    it("追加フェッチ失敗時に fetchMoreError がセットされ既存ユーザーは維持される", async () => {
      const initialUsers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));

      vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: initialUsers, total: FETCH_LIMIT });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 2 回目のトリガー前に fetchNonMembers をエラーに設定する
      vi.mocked(fetchNonMembers).mockRejectedValueOnce(new Error("fetch failed"));

      // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires and fails
      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.fetchMoreError).toContain("fetch failed");
      });

      // 既存ユーザーが維持されていること
      expect(result.current.users).toHaveLength(100);
      expect(result.current.users[0]?.id).toBe(1);
      expect(result.current.users[99]?.id).toBe(100);

      // フェッチ中フラグが false に戻っていること
      expect(result.current.isFetchingMore).toBe(false);
    });
  });
});
