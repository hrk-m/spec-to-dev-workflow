import { MockIntersectionObserver } from "@/test/setup";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { addGroupMembers } from "@/pages/group-detail/api/add-group-members";
import { useNonMemberList } from "@/pages/group-detail/model/useNonMemberList";
import { AddMemberSheet } from "@/pages/group-detail/ui/AddMemberSheet";

vi.mock("@/pages/group-detail/model/useNonMemberList", () => ({
  useNonMemberList: vi.fn(),
}));

vi.mock("@/pages/group-detail/api/add-group-members", () => ({
  addGroupMembers: vi.fn(),
}));

vi.mock("@/pages/group-detail/model/member-list", () => ({
  clearMemberListCache: vi.fn(),
}));

vi.mock("@/pages/group-detail/model/group-detail-state", () => ({
  useGroupDetail: vi.fn(() => ({
    group: null,
    error: null,
    isLoading: false,
    refetch: vi.fn(),
  })),
}));

const mockOnClose = vi.fn();

const defaultHookReturn = {
  users: [],
  total: 0,
  isLoading: false,
  error: null,
  searchQuery: "",
  setSearchQuery: vi.fn(),
  sentinelRef: { current: null },
  isFetchingMore: false,
  fetchMoreError: null,
  lastBatchSize: 100,
};

describe("AddMemberSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    MockIntersectionObserver.reset();
    vi.mocked(useNonMemberList).mockReturnValue(defaultHookReturn);
  });

  it("検索入力と一括追加ボタンが表示される", () => {
    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    expect(screen.getByPlaceholderText(/Search/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "一括追加" })).toBeInTheDocument();
  });

  it("ユーザー一覧が表示される", () => {
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      users: [
        { id: 1, first_name: "太郎", last_name: "山田" },
        { id: 2, first_name: "花子", last_name: "鈴木" },
      ],
      total: 2,
    });

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("鈴木 花子")).toBeInTheDocument();
  });

  it("ユーザーを選択して一括追加ボタンをクリックすると POST が呼ばれる", async () => {
    const user = userEvent.setup();
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
      total: 1,
    });
    vi.mocked(addGroupMembers).mockResolvedValueOnce({
      members: [{ id: 1, first_name: "太郎", last_name: "山田" }],
    });

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    const userName = screen.getByText("山田 太郎");
    await user.click(userName);

    await user.click(screen.getByRole("button", { name: "一括追加" }));

    await waitFor(() => {
      expect(addGroupMembers).toHaveBeenCalledWith({ groupId: 1, userIds: [1] });
    });
  });

  it("追加成功後に onClose が呼ばれる", async () => {
    const user = userEvent.setup();
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
      total: 1,
    });
    vi.mocked(addGroupMembers).mockResolvedValueOnce({
      members: [{ id: 1, first_name: "太郎", last_name: "山田" }],
    });

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    const userName = screen.getByText("山田 太郎");
    await user.click(userName);

    await user.click(screen.getByRole("button", { name: "一括追加" }));

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalledOnce();
    });
  });

  it("409 エラー時にエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
      total: 1,
    });
    vi.mocked(addGroupMembers).mockRejectedValueOnce(new Error("409 Conflict"));

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    const userName = screen.getByText("山田 太郎");
    await user.click(userName);

    await user.click(screen.getByRole("button", { name: "一括追加" }));

    await waitFor(() => {
      expect(screen.getByText("選択したユーザーはすでにメンバーです")).toBeInTheDocument();
    });

    expect(mockOnClose).not.toHaveBeenCalled();
  });

  it("その他のエラー時に汎用エラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
      total: 1,
    });
    vi.mocked(addGroupMembers).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    const userName = screen.getByText("山田 太郎");
    await user.click(userName);

    await user.click(screen.getByRole("button", { name: "一括追加" }));

    await waitFor(() => {
      expect(
        screen.getByText("エラーが発生しました。しばらくしてから再試行してください。"),
      ).toBeInTheDocument();
    });
  });

  it("ローディング中かつユーザーが未ロードの場合はスケルトンを表示する", () => {
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      users: [],
    });

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it("バックグラウンドフェッチ中でもユーザーが既にロード済みの場合はスケルトンを表示しない", () => {
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      isLoading: true,
      users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
      total: 1,
    });

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
  });

  describe("ページネーション UI が存在しない", () => {
    it("perPage セレクターボタン（20/50/100）が存在しない", () => {
      render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

      expect(screen.queryByRole("button", { name: "20" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: "100" })).not.toBeInTheDocument();
    });

    it("Previous/Next ボタンが存在しない", () => {
      vi.mocked(useNonMemberList).mockReturnValue({
        ...defaultHookReturn,
        users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
        total: 1,
      });

      render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

      expect(screen.queryByRole("button", { name: /Previous/i })).not.toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /Next/i })).not.toBeInTheDocument();
    });

    it("Page X of Y テキストが存在しない", () => {
      vi.mocked(useNonMemberList).mockReturnValue({
        ...defaultHookReturn,
        users: [{ id: 1, first_name: "太郎", last_name: "山田" }],
        total: 1,
      });

      render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

      expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    });
  });

  it("sentinel 要素が DOM に存在する", () => {
    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    expect(screen.getByTestId("non-member-sentinel")).toBeInTheDocument();
  });

  it("追加フェッチ失敗時にエラーメッセージが表示される", () => {
    vi.mocked(useNonMemberList).mockReturnValue({
      ...defaultHookReturn,
      users: [
        { id: 1, first_name: "太郎", last_name: "山田" },
        { id: 2, first_name: "花子", last_name: "鈴木" },
      ],
      total: 2,
      fetchMoreError: "Failed to fetch",
    });

    render(<AddMemberSheet groupId={1} onClose={mockOnClose} />);

    expect(screen.getByText("Failed to fetch")).toBeInTheDocument();
    // Existing items are still displayed
    expect(screen.getByText("山田 太郎")).toBeInTheDocument();
    expect(screen.getByText("鈴木 花子")).toBeInTheDocument();
  });
});
