import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchNonMembers } from "@/pages/group-detail/api/fetch-non-members";
import { PER_PAGE_OPTIONS, useNonMemberList } from "@/pages/group-detail/model/useNonMemberList";

vi.mock("@/pages/group-detail/api/fetch-non-members", () => ({
  fetchNonMembers: vi.fn(),
}));

describe("useNonMemberList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
      limit: 500,
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

  it("初期ローディング状態が true である", () => {
    vi.mocked(fetchNonMembers).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useNonMemberList(1));

    expect(result.current.isLoading).toBe(true);
    expect(result.current.users).toEqual([]);
    expect(result.current.error).toBeNull();
  });

  describe("ページネーション", () => {
    it("初期状態で currentPage=1, perPage=20, totalPages=1 を返す", async () => {
      vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: [], total: 0 });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.currentPage).toBe(1);
      expect(result.current.perPage).toBe(20);
      expect(result.current.totalPages).toBe(1);
    });

    it("PER_PAGE_OPTIONS が [20, 50, 100] である", () => {
      expect(PER_PAGE_OPTIONS).toEqual([20, 50, 100]);
    });

    it("users は cachedUsers のスライス（currentPage=1, perPage=20）を返す", async () => {
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: mockUsers, total: 25 });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.users).toHaveLength(20);
      expect(result.current.users[0]?.id).toBe(1);
      expect(result.current.totalPages).toBe(2);
    });

    it("setCurrentPage で 2 ページ目に切り替えると残りのユーザーが表示される", async () => {
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: mockUsers, total: 25 });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentPage(2);
      });

      expect(result.current.users).toHaveLength(5);
      expect(result.current.users[0]?.id).toBe(21);
    });

    it("setPerPage で perPage を変更すると currentPage が 1 にリセットされる", async () => {
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      vi.mocked(fetchNonMembers).mockResolvedValueOnce({ users: mockUsers, total: 25 });

      const { result } = renderHook(() => useNonMemberList(1));

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setCurrentPage(2);
      });
      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.setPerPage(50);
      });

      expect(result.current.currentPage).toBe(1);
      expect(result.current.perPage).toBe(50);
    });

    it("検索クエリ変更時に currentPage が 1 にリセットされる", async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      const mockUsers = Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        first_name: `名${i + 1}`,
        last_name: `姓${i + 1}`,
      }));
      vi.mocked(fetchNonMembers).mockResolvedValue({ users: mockUsers, total: 25 });

      const { result } = renderHook(() => useNonMemberList(1));

      await act(() => {
        vi.runAllTimers();
      });

      act(() => {
        result.current.setCurrentPage(2);
      });
      expect(result.current.currentPage).toBe(2);

      act(() => {
        result.current.setSearchQuery("テスト");
      });

      expect(result.current.currentPage).toBe(1);

      vi.useRealTimers();
    });
  });
});
