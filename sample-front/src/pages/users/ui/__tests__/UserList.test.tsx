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

  it("ローディング中はスケルトン行が表示される（テーブル行形式・3 列）", () => {
    vi.mocked(fetchUsers).mockReturnValue(new Promise(() => {}));

    renderUserList();

    // スケルトンローディング中は aria に loading テキストが存在する
    expect(screen.getByText("loading...")).toBeInTheDocument();
    // スケルトン行は <tr> として DOM に存在する
    const rows = document.querySelectorAll("tbody tr");
    expect(rows.length).toBeGreaterThan(0);
    // 各行に 3 つの <td> が存在する
    rows.forEach((row) => {
      expect(row.querySelectorAll("td").length).toBe(3);
    });
  });

  it("取得したユーザーの id・uuid・last_name・first_name がテーブルセルに表示される", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: [
        {
          id: 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Taro",
          last_name: "Yamada",
        },
      ],
      total: 1,
    });

    renderUserList();

    await waitFor(() => {
      expect(screen.getByText("1")).toBeInTheDocument();
    });

    expect(screen.getByText("550e8400-e29b-41d4-a716-446655440001")).toBeInTheDocument();
    expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
  });

  it("列ヘッダー id / uuid / 姓名 が存在する", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: [
        {
          id: 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Taro",
          last_name: "Yamada",
        },
      ],
      total: 1,
    });

    renderUserList();

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    // columnheader ロールは <th> 要素に付与される
    expect(screen.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "uuid" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "姓名" })).toBeInTheDocument();
  });

  it("アバターアイコン（頭文字円形）が DOM に存在しない", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({
      users: [
        {
          id: 1,
          uuid: "550e8400-e29b-41d4-a716-446655440001",
          first_name: "Taro",
          last_name: "Yamada",
        },
      ],
      total: 1,
    });

    renderUserList();

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    // アバター要素（data-testid="user-avatar"）が存在しないことを確認
    expect(document.querySelector("[data-testid='user-avatar']")).not.toBeInTheDocument();
    // 頭文字の "YT" が DOM にないことを確認
    expect(screen.queryByText("YT")).not.toBeInTheDocument();
  });

  it("0 件時は No users found メッセージが表示される", async () => {
    vi.mocked(fetchUsers).mockResolvedValueOnce({ users: [], total: 0 });

    renderUserList();

    await waitFor(() => {
      // header subtitle（見出し "Users" の直後の <p>）に "No users found" が表示されることを確認する
      const heading = screen.getByRole("heading", { name: "Users" });
      const subtitleEl = heading.nextElementSibling;
      expect(subtitleEl).toHaveTextContent("No users found");
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
        uuid: "550e8400-e29b-41d4-a716-446655440001",
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
