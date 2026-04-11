import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteGroup } from "@/pages/group-detail/api/delete-group";
import { DeleteGroupDialog } from "@/pages/group-detail/ui/DeleteGroupDialog";

vi.mock("@/pages/group-detail/api/delete-group", () => ({
  deleteGroup: vi.fn(),
}));

const defaultProps = {
  groupId: 1,
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
};

describe("DeleteGroupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ダイアログが開いているとき確認メッセージが表示される", () => {
    render(<DeleteGroupDialog {...defaultProps} />);

    expect(screen.getByRole("alertdialog")).toBeInTheDocument();
  });

  it("確認ボタンクリックで DELETE API が呼ばれる", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteGroup).mockResolvedValueOnce(undefined);

    render(<DeleteGroupDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(deleteGroup).toHaveBeenCalledWith(1);
    });
  });

  it("API 成功時に onSuccess が呼ばれる", async () => {
    const user = userEvent.setup();
    const onSuccess = vi.fn();
    vi.mocked(deleteGroup).mockResolvedValueOnce(undefined);

    render(<DeleteGroupDialog {...defaultProps} onSuccess={onSuccess} />);

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });

  it("API エラー時にダイアログ内にエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    vi.mocked(deleteGroup).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<DeleteGroupDialog {...defaultProps} />);

    const confirmButton = screen.getByRole("button", { name: "Delete" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });
  });
});
