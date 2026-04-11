import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateGroup } from "@/pages/group-detail/api/update-group";
import { EditGroupDialog } from "@/pages/group-detail/ui/EditGroupDialog";

vi.mock("@/pages/group-detail/api/update-group", () => ({
  updateGroup: vi.fn(),
}));

const defaultProps = {
  groupId: 1,
  initialName: "dev-team",
  initialDescription: "Development team",
  open: true,
  onOpenChange: vi.fn(),
  onSuccess: vi.fn(),
};

describe("EditGroupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ダイアログ開時に現在の name/description が初期値表示", () => {
    render(<EditGroupDialog {...defaultProps} />);

    expect(screen.getByDisplayValue("dev-team")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Development team")).toBeInTheDocument();
  });

  it("name 空で Save 押下 → インラインエラー表示", async () => {
    const user = userEvent.setup();
    render(<EditGroupDialog {...defaultProps} />);

    const nameInput = screen.getByDisplayValue("dev-team");
    await user.clear(nameInput);
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Name is required")).toBeInTheDocument();
  });

  it("name 101 文字で Save → インラインエラー表示", async () => {
    const user = userEvent.setup();
    render(<EditGroupDialog {...defaultProps} />);

    const nameInput = screen.getByDisplayValue("dev-team");
    await user.clear(nameInput);
    await user.type(nameInput, "a".repeat(101));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(screen.getByText("Name must be 100 characters or less")).toBeInTheDocument();
  });

  it("正常入力で Save 押下 → PUT API が呼ばれる", async () => {
    const user = userEvent.setup();
    vi.mocked(updateGroup).mockResolvedValueOnce({
      id: 1,
      name: "new-name",
      description: "new desc",
      member_count: 5,
    });

    render(<EditGroupDialog {...defaultProps} />);

    const nameInput = screen.getByDisplayValue("dev-team");
    await user.clear(nameInput);
    await user.type(nameInput, "new-name");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(updateGroup).toHaveBeenCalledWith(1, {
        name: "new-name",
        description: "Development team",
      });
    });
  });

  it("API 成功 → ダイアログが閉じる", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    vi.mocked(updateGroup).mockResolvedValueOnce({
      id: 1,
      name: "dev-team",
      description: "Development team",
      member_count: 5,
    });

    render(<EditGroupDialog {...defaultProps} onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it("API エラー → ダイアログ内にエラーメッセージ表示", async () => {
    const user = userEvent.setup();
    vi.mocked(updateGroup).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<EditGroupDialog {...defaultProps} />);

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });
  });
});
