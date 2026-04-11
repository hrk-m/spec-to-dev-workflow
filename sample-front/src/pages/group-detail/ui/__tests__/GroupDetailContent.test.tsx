import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { GroupDetail } from "@/pages/group-detail/model/group-detail";
import { GroupDetailContent } from "@/pages/group-detail/ui/GroupDetailContent";

vi.mock("react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router")>();
  return {
    ...actual,
    useNavigate: vi.fn(() => vi.fn()),
  };
});

vi.mock("@/pages/group-detail/model/group-detail-state", () => ({
  useGroupDetail: vi.fn(),
}));

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
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
});
