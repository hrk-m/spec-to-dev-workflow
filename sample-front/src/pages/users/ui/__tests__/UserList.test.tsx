import { MockIntersectionObserver } from "@/test/setup";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchUsers } from "@/pages/users/api/fetch-users";
import { clearUserListCache } from "@/pages/users/model/user-list";
import { UserList } from "@/pages/users/ui/UserList";

vi.mock("@/pages/users/api/fetch-users", () => ({
  fetchUsers: vi.fn(),
}));

function renderUserList() {
  return render(
    <MemoryRouter>
      <UserList />
    </MemoryRouter>,
  );
}

describe("UserList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearUserListCache();
    MockIntersectionObserver.reset();
  });

  it("Users タイトルを表示する", () => {
    vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));

    renderUserList();

    expect(screen.getByRole("heading", { name: "Users" })).toBeInTheDocument();
  });

  it("取得したユーザーを表示する", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: [{ id: 1, first_name: "Taro", last_name: "Yamada" }],
      total: 1,
    });

    renderUserList();

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });
    expect(screen.getByText("#1")).toBeInTheDocument();
  });

  it("ローディング中はスケルトン行が表示される", () => {
    vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));

    renderUserList();

    // スケルトンローディング中は aria に loading テキストが存在する
    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("0 件時は No users found メッセージが表示される", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    renderUserList();

    await waitFor(() => {
      expect(screen.getAllByText("No users found").length).toBeGreaterThan(0);
    });
  });

  it("エラー時はエラーメッセージが表示される", async () => {
    vi.mocked(fetchUsers).mockRejectedValueOnce(new Error("Network error"));

    renderUserList();

    await waitFor(() => {
      expect(screen.getByText("Couldn't load users")).toBeInTheDocument();
    });
  });

  it("ページネーション UI（Previous/Next ボタン・件数セレクタ）が存在しない", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: Array.from({ length: 25 }, (_, i) => ({
        id: i + 1,
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      })),
      total: 25,
    });

    renderUserList();

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "20" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "100" })).not.toBeInTheDocument();
  });

  it("sentinel 要素が DOM に存在する", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    renderUserList();

    await waitFor(() => {
      expect(screen.getByTestId("sentinel")).toBeInTheDocument();
    });
  });
});
