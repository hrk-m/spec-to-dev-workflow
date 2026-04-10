import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group, GroupsResponse } from "@/pages/home/model/group";
import { clearGroupListCache } from "@/pages/home/model/group-list";
import { GroupList } from "@/pages/home/ui/GroupList";

const mockNavigate = vi.fn();

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

function renderWithRouter(props?: { onGroupClick?: (groupId: number) => void }) {
  return render(
    <MemoryRouter>
      <GroupList {...props} />
    </MemoryRouter>,
  );
}

vi.mock("@/pages/home/api/fetch-groups", () => ({
  fetchGroups: vi.fn(),
}));

const engineeringGroup: Group = {
  id: 1,
  name: "Engineering",
  description: "Engineering team",
  member_count: 2,
};

const designGroup: Group = {
  id: 2,
  name: "Design",
  description: "Design team",
  member_count: 1,
};

const mockGroupsResponse: GroupsResponse = {
  groups: [engineeringGroup, designGroup],
  total: 2,
};

function createManyGroups(count: number): GroupsResponse {
  const groups = Array.from({ length: Math.min(count, 500) }, (_, i) => ({
    id: i + 1,
    name: `Group${String(i + 1)}`,
    description: `Description ${String(i + 1)}`,
    member_count: i + 1,
  }));
  return { groups, total: count };
}

describe("GroupList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGroupListCache();
  });

  it("初期表示で loading を表示する", () => {
    vi.mocked(fetchGroups).mockReturnValue(new Promise(() => {}));

    renderWithRouter();

    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("API が成功した場合はグループ一覧を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Engineering team")).toBeInTheDocument();
    expect(screen.getByText("Design team")).toBeInTheDocument();
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });

  it("メンバー数を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("2 members")).toBeInTheDocument();
    });
    expect(screen.getByText("1 member")).toBeInTheDocument();
  });

  it("ページネーション情報を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });
    expect(screen.getByText("Showing 2 of 2 groups")).toBeInTheDocument();
  });

  it("API がエラーの場合はエラーメッセージを表示する", async () => {
    vi.mocked(fetchGroups).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });

  it("検索入力でグループを検索できる", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroups)
      .mockResolvedValueOnce(mockGroupsResponse)
      .mockResolvedValueOnce({
        groups: [engineeringGroup],
        total: 1,
      });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or description");
    await user.clear(searchInput);
    await user.type(searchInput, "Eng");

    await waitFor(() => {
      expect(vi.mocked(fetchGroups)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "Eng" }),
      );
    });
  });

  it("タイトルを表示する", () => {
    vi.mocked(fetchGroups).mockReturnValue(new Promise(() => {}));

    renderWithRouter();

    expect(screen.getByRole("heading", { name: "Groups" })).toBeInTheDocument();
  });

  it("再表示時はキャッシュを使って loading を出さない", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { unmount } = renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    unmount();

    renderWithRouter();

    expect(screen.getByText("Engineering")).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });

  it("2ページ目でも再表示時はキャッシュを使って loading を出さない", async () => {
    const user = userEvent.setup();
    const manyGroups = createManyGroups(50);
    vi.mocked(fetchGroups).mockResolvedValueOnce(manyGroups).mockReturnValueOnce(new Promise(() => {}));

    const { unmount } = renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Next" }));

    await waitFor(() => {
      expect(screen.getByText("Group21")).toBeInTheDocument();
    });

    unmount();

    renderWithRouter();

    expect(screen.getByText("Group21")).toBeInTheDocument();
    expect(screen.getByText("Group40")).toBeInTheDocument();
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });

  it("セクションヘッダーを表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(screen.getByText("All Groups")).toBeInTheDocument();
  });

  it("perPage 切り替えボタンを表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "50" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "100" })).toBeInTheDocument();
  });

  it("デフォルトで 20 件/ページ表示する", async () => {
    const manyGroups = createManyGroups(50);
    vi.mocked(fetchGroups).mockResolvedValueOnce(manyGroups);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    expect(screen.getByText("Group20")).toBeInTheDocument();
    expect(screen.queryByText("Group21")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("perPage を 50 に切り替えられる", async () => {
    const user = userEvent.setup();
    const manyGroups = createManyGroups(100);
    vi.mocked(fetchGroups).mockResolvedValueOnce(manyGroups);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    const button50 = screen.getByRole("button", { name: "50" });
    await user.click(button50);

    await waitFor(() => {
      expect(screen.getByText("Group50")).toBeInTheDocument();
    });
    expect(screen.queryByText("Group51")).not.toBeInTheDocument();
  });

  it("Next / Previous ボタンでページを切り替えられる", async () => {
    const user = userEvent.setup();
    const manyGroups = createManyGroups(50);
    vi.mocked(fetchGroups).mockResolvedValueOnce(manyGroups);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    });
    expect(screen.getByText("Group21")).toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: "Previous" });
    await user.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });
  });

  it("500 件キャッシュを超えるページに遷移すると offset=500 で追加フェッチする", async () => {
    const user = userEvent.setup();

    const initialResponse = createManyGroups(520);
    vi.mocked(fetchGroups).mockResolvedValueOnce(initialResponse);

    const additionalGroups = Array.from({ length: 20 }, (_, i) => ({
      id: 501 + i,
      name: `Group${String(501 + i)}`,
      description: `Description ${String(501 + i)}`,
      member_count: 501 + i,
    }));
    vi.mocked(fetchGroups).mockResolvedValueOnce({
      groups: additionalGroups,
      total: 520,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    const button100 = screen.getByRole("button", { name: "100" });
    await user.click(button100);

    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);

    await waitFor(() => {
      expect(vi.mocked(fetchGroups)).toHaveBeenCalledWith(
        expect.objectContaining({ offset: 500, limit: 500 }),
      );
    });
  });

  it("最終ページでは Next ボタンが無効になる", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next" });
    expect(nextButton).toBeDisabled();
  });

  it("最初のページでは Previous ボタンが無効になる", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const prevButton = screen.getByRole("button", { name: "Previous" });
    expect(prevButton).toBeDisabled();
  });

  it("行クリックで onGroupClick が呼ばれる（navigate は呼ばれない）", async () => {
    const user = userEvent.setup();
    const onGroupClick = vi.fn();
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter({ onGroupClick });

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const engineeringRow = screen.getByText("Engineering").closest("[role='button']");
    expect(engineeringRow).not.toBeNull();
    if (engineeringRow) {
      await user.click(engineeringRow);
    }

    expect(onGroupClick).toHaveBeenCalledTimes(1);
    expect(onGroupClick).toHaveBeenCalledWith(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("検索結果が 0 件のとき 'No groups found' を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce({ groups: [], total: 0 });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("No groups found")).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading groups...")).not.toBeInTheDocument();
  });

  it("検索で 0 件のとき API の total が全件数でもページネーションを非表示にする", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse).mockResolvedValueOnce({
      groups: [],
      total: 31,
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or description");
    await user.clear(searchInput);
    await user.type(searchInput, "nonexistent");

    await waitFor(() => {
      expect(screen.getByText("No groups matched that search.")).toBeInTheDocument();
    });

    expect(screen.getByText("No groups found")).toBeInTheDocument();
    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  it("検索結果の件数ラベルは cachedGroups の長さを使う（API の total ではない）", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroups)
      .mockResolvedValueOnce(mockGroupsResponse)
      .mockResolvedValueOnce({
        groups: [engineeringGroup],
        total: 31,
      });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or description");
    await user.clear(searchInput);
    await user.type(searchInput, "Eng");

    await waitFor(() => {
      expect(screen.getByText("1 groups")).toBeInTheDocument();
    });
    expect(screen.queryByText("31 groups")).not.toBeInTheDocument();
  });

  it("検索入力がデバウンスされ、最後の入力から 300ms 後にフェッチが発火する", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroups)
      .mockResolvedValueOnce(mockGroupsResponse)
      .mockResolvedValueOnce({
        groups: [engineeringGroup],
        total: 1,
      });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const initialCallCount = vi.mocked(fetchGroups).mock.calls.length;

    const searchInput = screen.getByPlaceholderText("Search by name or description");
    await user.type(searchInput, "Eng");

    // デバウンス後にフェッチが発火する（300ms 後）
    await waitFor(() => {
      expect(vi.mocked(fetchGroups).mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    // 文字ごとに個別フェッチされるのではなく、デバウンス後にまとめて 1 回だけ発火する
    const searchCalls = vi.mocked(fetchGroups).mock.calls.slice(initialCallCount);
    expect(searchCalls).toHaveLength(1);
    expect(vi.mocked(fetchGroups)).toHaveBeenLastCalledWith(expect.objectContaining({ q: "Eng" }));
  });
});
