import { MockIntersectionObserver } from "@/test/setup";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group, GroupsResponse } from "@/pages/home/model/group";
import { clearGroupListCache, FETCH_LIMIT } from "@/pages/home/model/group-list";
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

describe("GroupList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGroupListCache();
    MockIntersectionObserver.reset();
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
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    // テーブルセルでは数字のみ表示
    const cells = screen.getAllByRole("cell");
    const cellTexts = cells.map((cell) => cell.textContent);
    expect(cellTexts).toContain("2");
    expect(cellTexts).toContain("1");
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
    vi.mocked(fetchGroups)
      .mockResolvedValueOnce(mockGroupsResponse)
      .mockReturnValueOnce(new Promise(() => {}));

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

  it("セクションヘッダーを表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(screen.getByText("All Groups")).toBeInTheDocument();
  });

  it("行クリックで onGroupClick が呼ばれる（navigate は呼ばれない）", async () => {
    const user = userEvent.setup();
    const onGroupClick = vi.fn();
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter({ onGroupClick });

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const engineeringRow = screen.getByText("Engineering").closest("tr");
    expect(engineeringRow).not.toBeNull();
    if (engineeringRow) {
      await user.click(engineeringRow);
    }

    expect(onGroupClick).toHaveBeenCalledTimes(1);
    expect(onGroupClick).toHaveBeenCalledWith(1);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("ID 列の columnheader ロールがアクセシブルである", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByRole("columnheader", { name: "ID" })).toBeInTheDocument();
  });

  it("グループ名列の columnheader ロールがアクセシブルである", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByRole("columnheader", { name: "グループ名" })).toBeInTheDocument();
  });

  it("説明列の columnheader ロールがアクセシブルである", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByRole("columnheader", { name: "説明" })).toBeInTheDocument();
  });

  it("メンバー数列の columnheader ロールがアクセシブルである", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    expect(screen.getByRole("columnheader", { name: "メンバー数" })).toBeInTheDocument();
  });

  it("行クリックで navigate が呼ばれる (onGroupClick なし)", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    const engineeringRow = screen.getByText("Engineering").closest("tr");
    expect(engineeringRow).not.toBeNull();
    if (engineeringRow) {
      await user.click(engineeringRow);
    }
    expect(mockNavigate).toHaveBeenCalledWith("/groups/1");
  });

  it("tr に role='button' が付与されていない", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);
    renderWithRouter();
    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });
    const rows = screen.getAllByRole("row");
    rows.forEach((row) => {
      expect(row).not.toHaveAttribute("role", "button");
    });
  });

  it("検索結果が 0 件のとき 'No groups found' を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce({ groups: [], total: 0 });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("No groups found")).toBeInTheDocument();
    });
    expect(screen.queryByText("Loading groups...")).not.toBeInTheDocument();
  });

  it("ページネーション UI（Previous/Next ボタン・件数セレクタ）が存在しない", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "20" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "50" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "100" })).not.toBeInTheDocument();
  });

  it("sentinel 要素が DOM に存在する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("sentinel")).toBeInTheDocument();
    });
  });

  it("fetch 後に cachedGroups の全件が表示される", async () => {
    const manyGroups = Array.from({ length: 55 }, (_, i) => ({
      id: i + 1,
      name: `Group${String(i + 1)}`,
      description: `Description ${String(i + 1)}`,
      member_count: i + 1,
    }));
    vi.mocked(fetchGroups).mockResolvedValueOnce({ groups: manyGroups, total: 55 });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    // DISPLAY_STEP 廃止後は全件即時表示される
    expect(screen.getByText("Group51")).toBeInTheDocument();
    expect(screen.getByText("Group55")).toBeInTheDocument();
  });

  it("キャッシュ枯渇かつ lastBatchSize === FETCH_LIMIT のとき次 offset でフェッチする", async () => {
    const initialGroups = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
      id: i + 1,
      name: `Group${String(i + 1)}`,
      description: `Description ${String(i + 1)}`,
      member_count: i + 1,
    }));
    const additionalGroups = [
      {
        id: FETCH_LIMIT + 1,
        name: `Group${String(FETCH_LIMIT + 1)}`,
        description: "Extra",
        member_count: 0,
      },
    ];

    vi.mocked(fetchGroups)
      .mockResolvedValueOnce({ groups: initialGroups, total: FETCH_LIMIT + 1 })
      .mockResolvedValueOnce({ groups: additionalGroups, total: FETCH_LIMIT + 1 });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires
    act(() => {
      MockIntersectionObserver.triggerAll([
        { isIntersecting: true, target: document.createElement("div") },
      ]);
    });

    await waitFor(() => {
      expect(vi.mocked(fetchGroups)).toHaveBeenCalledWith(
        expect.objectContaining({ offset: FETCH_LIMIT }),
      );
    });
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

  it("追加フェッチ失敗時にリスト末尾にエラーメッセージが表示され、既存アイテムは維持される", async () => {
    const initialGroups = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
      id: i + 1,
      name: `Group${String(i + 1)}`,
      description: `Description ${String(i + 1)}`,
      member_count: i + 1,
    }));

    vi.mocked(fetchGroups)
      .mockResolvedValueOnce({ groups: initialGroups, total: FETCH_LIMIT + 10 })
      .mockRejectedValueOnce(new Error("500 Internal Server Error"));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires and fails
    act(() => {
      MockIntersectionObserver.triggerAll([
        { isIntersecting: true, target: document.createElement("div") },
      ]);
    });

    await waitFor(() => {
      expect(screen.getByText(/500 Internal Server Error/)).toBeInTheDocument();
    });

    // Existing items are still in DOM
    expect(screen.getByText("Group1")).toBeInTheDocument();
  });

  it("検索変更後に検索前のデータがリセットされ検索結果が表示される", async () => {
    const user = userEvent.setup();

    const manyGroups = Array.from({ length: 60 }, (_, i) => ({
      id: i + 1,
      name: `Group${String(i + 1)}`,
      description: `Description ${String(i + 1)}`,
      member_count: i + 1,
    }));
    const searchGroups = Array.from({ length: 5 }, (_, i) => ({
      id: i + 100,
      name: `SearchResult${String(i + 1)}`,
      description: `Search description ${String(i + 1)}`,
      member_count: i + 1,
    }));

    vi.mocked(fetchGroups)
      .mockResolvedValueOnce({ groups: manyGroups, total: 60 })
      .mockResolvedValueOnce({ groups: searchGroups, total: 5 });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Group1")).toBeInTheDocument();
    });

    // DISPLAY_STEP 廃止後は全件表示されるため Group51 も初期表示に含まれる
    expect(screen.getByText("Group51")).toBeInTheDocument();

    // Change search keyword (debounce kicks in after 300ms)
    const searchInput = screen.getByPlaceholderText("Search by name or description");
    await user.clear(searchInput);
    await user.type(searchInput, "x");

    // Wait for debounce and search results
    await waitFor(
      () => {
        expect(screen.getByText("SearchResult1")).toBeInTheDocument();
      },
      { timeout: 2000 },
    );

    // After search, previous groups are no longer shown
    expect(screen.queryByText("Group1")).not.toBeInTheDocument();
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
});
