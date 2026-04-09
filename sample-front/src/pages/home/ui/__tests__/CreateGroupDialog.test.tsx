import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGroup } from "@/pages/home/api/create-group";
import { CreateGroupDialog } from "@/pages/home/ui/CreateGroupDialog";

vi.mock("@/pages/home/api/create-group", () => ({
  createGroup: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

async function renderAndOpenDialog() {
  const user = userEvent.setup();
  render(<CreateGroupDialog />);

  const triggerButton = screen.getByRole("button", { name: /Create Group/i });
  await user.click(triggerButton);

  return user;
}

describe("CreateGroupDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("トリガーボタンクリックでモーダルが表示される", async () => {
    await renderAndOpenDialog();

    expect(screen.getByLabelText("Name")).toBeInTheDocument();
    expect(screen.getByLabelText("Description")).toBeInTheDocument();
  });

  it("name 空文字で Create 押下するとエラー表示", async () => {
    const user = await renderAndOpenDialog();

    const createButton = screen.getByRole("button", { name: "Create" });
    await user.click(createButton);

    expect(screen.getByText("Name is required")).toBeInTheDocument();
    expect(vi.mocked(createGroup)).not.toHaveBeenCalled();
  });

  it("name 101 文字で Create 押下するとエラー表示", async () => {
    const user = await renderAndOpenDialog();

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "a".repeat(101));

    const createButton = screen.getByRole("button", { name: "Create" });
    await user.click(createButton);

    expect(screen.getByText("Name must be 100 characters or less")).toBeInTheDocument();
    expect(vi.mocked(createGroup)).not.toHaveBeenCalled();
  });

  it("正常入力で Create 押下すると POST API が呼ばれる", async () => {
    vi.mocked(createGroup).mockResolvedValueOnce({
      id: 1,
      name: "New Group",
      description: "A new group",
      member_count: 0,
    });

    const user = await renderAndOpenDialog();

    const nameInput = screen.getByLabelText("Name");
    const descInput = screen.getByLabelText("Description");
    await user.type(nameInput, "New Group");
    await user.type(descInput, "A new group");

    const createButton = screen.getByRole("button", { name: "Create" });
    await user.click(createButton);

    await waitFor(() => {
      expect(vi.mocked(createGroup)).toHaveBeenCalledWith({
        name: "New Group",
        description: "A new group",
      });
    });
  });

  it("API エラー時にモーダル内にエラーメッセージ表示", async () => {
    vi.mocked(createGroup).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    const user = await renderAndOpenDialog();

    const nameInput = screen.getByLabelText("Name");
    await user.type(nameInput, "New Group");

    const createButton = screen.getByRole("button", { name: "Create" });
    await user.click(createButton);

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });

    // Modal stays open
    expect(screen.getByLabelText("Name")).toBeInTheDocument();
  });
});
