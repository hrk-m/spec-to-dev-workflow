import { MockIntersectionObserver } from "@/test/setup";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import { clearGroupListCache, FETCH_LIMIT, useGroupList } from "@/pages/home/model/group-list";

vi.mock("@/pages/home/api/fetch-groups", () => ({
  fetchGroups: vi.fn(),
}));

describe("useGroupList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGroupListCache();
    MockIntersectionObserver.reset();
  });

  it("マウント時に API を呼び出し groups と total をセットする", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce({
      groups: [
        { id: 1, name: "Group A", description: "Description A", member_count: 3 },
        { id: 2, name: "Group B", description: "Description B", member_count: 5 },
      ],
      total: 2,
    });

    const { result } = renderHook(() => useGroupList());

    await waitFor(() => {
      expect(result.current.groups).toHaveLength(2);
    });

    expect(result.current.total).toBe(2);
  });

  it("API エラー時に error をセットする", async () => {
    vi.mocked(fetchGroups).mockRejectedValueOnce(new Error("Network error"));

    const { result } = renderHook(() => useGroupList());

    await waitFor(() => {
      expect(result.current.error).toContain("Network error");
    });
  });

  it("検索クエリを 300ms デバウンスしてから API を呼び出す", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });

    vi.mocked(fetchGroups)
      .mockResolvedValueOnce({
        groups: [{ id: 1, name: "Group A", description: "Desc A", member_count: 1 }],
        total: 1,
      })
      .mockResolvedValueOnce({
        groups: [{ id: 2, name: "Group B", description: "Desc B", member_count: 2 }],
        total: 1,
      });

    const { result } = renderHook(() => useGroupList());

    await act(() => {
      vi.runAllTimers();
    });

    act(() => {
      result.current.setSearchQuery("test");
    });

    // 300ms 経過前はまだ呼ばれていない
    await act(() => {
      vi.advanceTimersByTime(299);
    });

    expect(vi.mocked(fetchGroups)).toHaveBeenCalledTimes(1);

    await act(() => {
      vi.advanceTimersByTime(1);
    });

    await waitFor(() => {
      expect(vi.mocked(fetchGroups)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "test" }),
      );
    });

    vi.useRealTimers();
  });

  it("初期ローディング状態が true である", () => {
    vi.mocked(fetchGroups).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useGroupList());

    expect(result.current.isLoading).toBe(true);
    expect(result.current.groups).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  describe("無限スクロール", () => {
    it("groups は cachedGroups の全件を返す", async () => {
      const groups = Array.from({ length: 55 }, (_, i) => ({
        id: i + 1,
        name: `Group${String(i + 1)}`,
        description: `Desc${String(i + 1)}`,
        member_count: i + 1,
      }));

      vi.mocked(fetchGroups).mockResolvedValueOnce({ groups, total: 55 });

      const { result } = renderHook(() => useGroupList());

      await waitFor(() => {
        expect(result.current.groups).toHaveLength(55);
      });
    });

    it("sentinel が visible になったら doFetchMore を呼ぶ（lastBatchSize === FETCH_LIMIT のとき）", async () => {
      const initialGroups = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        name: `Group${String(i + 1)}`,
        description: `Desc${String(i + 1)}`,
        member_count: i + 1,
      }));
      const additionalGroups = [
        { id: FETCH_LIMIT + 1, name: "Extra Group", description: "Extra Desc", member_count: 1 },
      ];

      vi.mocked(fetchGroups)
        .mockResolvedValueOnce({ groups: initialGroups, total: FETCH_LIMIT + 1 })
        .mockResolvedValueOnce({ groups: additionalGroups, total: FETCH_LIMIT + 1 });

      const { result } = renderHook(() => useGroupList());

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
        expect(vi.mocked(fetchGroups)).toHaveBeenCalledWith(
          expect.objectContaining({ offset: FETCH_LIMIT }),
        );
      });
    });

    it("sentinel が visible になった後に追加データが表示される", async () => {
      const initialGroups = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        name: `Group${String(i + 1)}`,
        description: `Desc${String(i + 1)}`,
        member_count: i + 1,
      }));
      const additionalGroups = [
        { id: FETCH_LIMIT + 1, name: "Extra Group", description: "Extra Desc", member_count: 1 },
      ];

      vi.mocked(fetchGroups)
        .mockResolvedValueOnce({ groups: initialGroups, total: FETCH_LIMIT + 1 })
        .mockResolvedValueOnce({ groups: additionalGroups, total: FETCH_LIMIT + 1 });

      const { result } = renderHook(() => useGroupList());

      await waitFor(() => {
        expect(result.current.groups).toHaveLength(FETCH_LIMIT);
      });

      act(() => {
        MockIntersectionObserver.triggerAll([
          { isIntersecting: true, target: document.createElement("div") },
        ]);
      });

      await waitFor(() => {
        expect(result.current.groups).toHaveLength(FETCH_LIMIT + 1);
      });
    });

    it("追加フェッチ失敗時に fetchMoreError がセットされ既存グループは維持される", async () => {
      const initialGroups = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
        id: i + 1,
        name: `Group${String(i + 1)}`,
        description: `Desc${String(i + 1)}`,
        member_count: i + 1,
      }));

      vi.mocked(fetchGroups)
        .mockResolvedValueOnce({ groups: initialGroups, total: FETCH_LIMIT + 10 })
        .mockRejectedValueOnce(new Error("Network error"));

      const { result } = renderHook(() => useGroupList());

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
      expect(result.current.groups.length).toBeGreaterThan(0);
    });
  });
});
