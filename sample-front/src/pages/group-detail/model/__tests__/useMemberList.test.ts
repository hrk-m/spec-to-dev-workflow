import { MockIntersectionObserver } from "@/test/setup";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import {
  clearMemberListCache,
  FETCH_LIMIT,
  useMemberList,
} from "@/pages/group-detail/model/member-list";

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
}));

describe("useMemberList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMemberListCache();
    MockIntersectionObserver.reset();
  });

  it("マウント時に API を呼び出し members と total をセットする", async () => {
    const mockMembers = [{ id: 1, first_name: "太郎", last_name: "山田" }];
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce({ members: mockMembers, total: 1 });

    const { result } = renderHook(() => useMemberList(1));

    expect(result.current.isLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.members).toEqual(mockMembers);
    expect(result.current.total).toBe(1);
    expect(fetchGroupMembers).toHaveBeenCalledWith({
      groupId: 1,
      limit: FETCH_LIMIT,
      offset: 0,
    });
  });

  it("API エラー時に error をセットする", async () => {
    vi.mocked(fetchGroupMembers).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useMemberList(1));

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    expect(result.current.error).toContain("Network error");
    expect(result.current.members).toEqual([]);
  });

  it("検索クエリを 300ms デバウンスしてから API を呼び出す", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.mocked(fetchGroupMembers).mockResolvedValue({ members: [], total: 0 });

    const { result } = renderHook(() => useMemberList(1));

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
    expect(fetchGroupMembers).not.toHaveBeenCalled();

    // 300ms 経過させる
    await act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(fetchGroupMembers).toHaveBeenCalledWith(
      expect.objectContaining({ q: "山田", offset: 0 }),
    );

    vi.useRealTimers();
  });

  it("初期ローディング状態が true である", () => {
    vi.mocked(fetchGroupMembers).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useMemberList(1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.members).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  describe("無限スクロール", () => {
    it("members は cachedMembers の全件を返す", async () => {
      const mockMembers = Array.from({ length: 55 }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      vi.mocked(fetchGroupMembers).mockResolvedValueOnce({ members: mockMembers, total: 55 });

      const { result } = renderHook(() => useMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.members).toHaveLength(55);
      expect(result.current.members[0]?.id).toBe(1);
    });

    it("sentinel が visible になったら doFetchMore を呼ぶ（lastBatchSize === FETCH_LIMIT のとき）", async () => {
      const initialMembers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      const additionalMembers = Array.from({ length: 10 }, (_, i) => ({
        id: FETCH_LIMIT + i + 1,
        first_name: `名${FETCH_LIMIT + i + 1}`,
        last_name: `姓${FETCH_LIMIT + i + 1}`,
      }));

      vi.mocked(fetchGroupMembers)
        .mockResolvedValueOnce({ members: initialMembers, total: FETCH_LIMIT + 10 })
        .mockResolvedValueOnce({ members: additionalMembers, total: FETCH_LIMIT + 10 });

      const { result } = renderHook(() => useMemberList(1));

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
        expect(vi.mocked(fetchGroupMembers)).toHaveBeenCalledWith(
          expect.objectContaining({ offset: FETCH_LIMIT }),
        );
      });
    });

    it("sentinel が visible になった後に追加データが表示される", async () => {
      const initialMembers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      const additionalMembers = Array.from({ length: 10 }, (_, i) => ({
        id: FETCH_LIMIT + i + 1,
        first_name: `名${FETCH_LIMIT + i + 1}`,
        last_name: `姓${FETCH_LIMIT + i + 1}`,
      }));

      vi.mocked(fetchGroupMembers)
        .mockResolvedValueOnce({ members: initialMembers, total: FETCH_LIMIT + 10 })
        .mockResolvedValueOnce({ members: additionalMembers, total: FETCH_LIMIT + 10 });

      const { result } = renderHook(() => useMemberList(1));

      await waitFor(() => {
        expect(result.current.members).toHaveLength(FETCH_LIMIT);
      });

      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.members).toHaveLength(FETCH_LIMIT + 10);
      });
    });

    it("追加フェッチ失敗時に fetchMoreError がセットされ既存メンバーは維持される", async () => {
      const initialMembers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));

      vi.mocked(fetchGroupMembers).mockResolvedValueOnce({
        members: initialMembers,
        total: FETCH_LIMIT,
      });

      const { result } = renderHook(() => useMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // 2 回目のトリガー前に fetchGroupMembers をエラーに設定する
      vi.mocked(fetchGroupMembers).mockRejectedValueOnce(new Error("fetch failed"));

      // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires and fails
      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.fetchMoreError).toContain("fetch failed");
      });

      // 既存メンバーが維持されていること
      expect(result.current.members).toHaveLength(100);
      expect(result.current.members[0]?.id).toBe(1);
      expect(result.current.members[99]?.id).toBe(100);

      // フェッチ中フラグが false に戻っていること
      expect(result.current.isFetchingMore).toBe(false);
    });
  });
});
