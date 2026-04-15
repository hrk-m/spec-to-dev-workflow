import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type * as ReactRouter from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { GroupDetail } from "@/pages/group-detail/model/group-detail";
import { GroupDetailContent } from "@/pages/group-detail/ui/GroupDetailContent";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouter>();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("@/shared/lib/sheet-stack", () => ({
  useSheetStack: vi.fn(() => ({
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
    sheets: [],
  })),
}));

vi.mock("@/pages/group-detail/model/group-detail-state", () => ({
  useGroupDetail: vi.fn(),
}));

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
}));

vi.mock("@/pages/group-detail/model/member-list", () => ({
  clearMemberListCache: vi.fn(),
  useMemberList: vi.fn(() => ({
    members: [],
    total: 0,
    searchQuery: "",
    error: null,
    isLoading: false,
    isFetchingMore: false,
    fetchMoreError: null,
    sentinelRef: { current: null },
    setSearchQuery: vi.fn(),
  })),
}));

vi.mock("@/pages/group-detail/ui/AddMemberSheet", () => ({
  AddMemberSheet: vi.fn(() => null),
}));

const mockGroup: GroupDetail = {
  id: 1,
  name: "dev-team",
  description: "Development team",
  member_count: 3,
};

describe("GroupDetailContent", () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    const { useGroupDetail } = await import("@/pages/group-detail/model/group-detail-state");
    vi.mocked(useGroupDetail).mockReturnValue({
      group: mockGroup,
      error: null,
      isLoading: false,
      refetch: vi.fn(),
    });

    vi.mocked(fetchGroupMembers).mockResolvedValue({
      members: [],
      total: 0,
    });
  });

  it("Delete ボタンクリックで確認ダイアログが開く", async () => {
    const user = userEvent.setup();

    render(<GroupDetailContent groupId={1} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Delete" })).toBeInTheDocument();
    });

    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Delete" }));

    await waitFor(() => {
      expect(screen.getByRole("alertdialog")).toBeInTheDocument();
    });
  });

  it("「メンバー追加」ボタン押下で AddMemberSheet が表示される", async () => {
    const user = userEvent.setup();

    const { useSheetStack } = await import("@/shared/lib/sheet-stack");
    const mockOpenSheet = vi.fn();
    vi.mocked(useSheetStack).mockReturnValue({
      openSheet: mockOpenSheet,
      closeSheet: vi.fn(),
      sheets: [],
      removeSheet: vi.fn(),
      closeAll: vi.fn(),
    });

    render(<GroupDetailContent groupId={1} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "メンバー追加" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "メンバー追加" }));

    expect(mockOpenSheet).toHaveBeenCalledOnce();
    expect(mockOpenSheet).toHaveBeenCalledWith(expect.objectContaining({ id: "add-member-1" }));
  });

  it("追加成功後に MemberList と member_count が再取得される", async () => {
    const user = userEvent.setup();

    const { useSheetStack } = await import("@/shared/lib/sheet-stack");
    const mockCloseSheet = vi.fn();
    const mockOpenSheet = vi.fn();
    vi.mocked(useSheetStack).mockReturnValue({
      openSheet: mockOpenSheet,
      closeSheet: mockCloseSheet,
      sheets: [],
      removeSheet: vi.fn(),
      closeAll: vi.fn(),
    });

    const mockRefetch = vi.fn();
    const { useGroupDetail } = await import("@/pages/group-detail/model/group-detail-state");
    vi.mocked(useGroupDetail).mockReturnValue({
      group: mockGroup,
      error: null,
      isLoading: false,
      refetch: mockRefetch,
    });

    render(<GroupDetailContent groupId={1} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "メンバー追加" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "メンバー追加" }));

    expect(mockOpenSheet).toHaveBeenCalledOnce();

    // openSheet に渡されたコンテンツの onClose を取得して実行する
    const openSheetArg = mockOpenSheet.mock.calls[0]?.[0] as {
      id: string;
      content: { props: { onClose: () => void } };
    };
    expect(openSheetArg.id).toBe("add-member-1");

    // onClose コールバックを直接呼び出してシミュレート
    openSheetArg.content.props.onClose();

    // AddMemberSheet 内での clearMemberListCache 呼び出しは AddMemberSheet 自身の責務のため
    // GroupDetailContent の onClose では closeSheet と refetch が呼ばれることを検証する
    expect(mockCloseSheet).toHaveBeenCalledOnce();
    expect(mockRefetch).toHaveBeenCalledOnce();
  });
});
