import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroups } from "@/pages/home/api/fetch-groups";
import type { Group, GroupsResponse } from "@/pages/home/model/group";
import { GroupList } from "@/pages/home/ui/GroupList";

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
  pagination: { total: 2, page: 1, limit: 10 },
};

describe("GroupList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期表示で loading を表示する", () => {
    vi.mocked(fetchGroups).mockReturnValue(new Promise(() => {}));

    render(<GroupList />);

    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("API が成功した場合はグループ一覧を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    render(<GroupList />);

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

    render(<GroupList />);

    await waitFor(() => {
      expect(screen.getByText("2 members")).toBeInTheDocument();
    });
    expect(screen.getByText("1 member")).toBeInTheDocument();
  });

  it("ページネーション情報を表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    render(<GroupList />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });
    expect(screen.getByText("Showing 2 of 2 groups")).toBeInTheDocument();
  });

  it("API がエラーの場合はエラーメッセージを表示する", async () => {
    vi.mocked(fetchGroups).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<GroupList />);

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
        pagination: { total: 1, page: 1, limit: 10 },
      });

    render(<GroupList />);

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search by name or description");
    await user.clear(searchInput);
    await user.type(searchInput, "Eng");

    await waitFor(() => {
      expect(vi.mocked(fetchGroups)).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "Eng" }),
      );
    });
  });

  it("Load More ボタンで次のページに遷移できる", async () => {
    const user = userEvent.setup();
    const multiPageResponse: GroupsResponse = {
      ...mockGroupsResponse,
      pagination: { total: 20, page: 1, limit: 10 },
    };
    vi.mocked(fetchGroups)
      .mockResolvedValueOnce(multiPageResponse)
      .mockResolvedValueOnce({
        ...mockGroupsResponse,
        pagination: { total: 20, page: 2, limit: 10 },
      });

    render(<GroupList />);

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    const loadMoreButton = screen.getByRole("button", { name: "Load More" });
    await user.click(loadMoreButton);

    await waitFor(() => {
      expect(vi.mocked(fetchGroups)).toHaveBeenLastCalledWith(expect.objectContaining({ page: 2 }));
    });
  });

  it("最終ページでは Load More ボタンを表示しない", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    render(<GroupList />);

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(screen.queryByRole("button", { name: "Load More" })).not.toBeInTheDocument();
  });

  it("タイトルを表示する", () => {
    vi.mocked(fetchGroups).mockReturnValue(new Promise(() => {}));

    render(<GroupList />);

    expect(screen.getByRole("heading", { name: "Groups" })).toBeInTheDocument();
  });

  it("セクションヘッダーを表示する", async () => {
    vi.mocked(fetchGroups).mockResolvedValueOnce(mockGroupsResponse);

    render(<GroupList />);

    await waitFor(() => {
      expect(screen.getByText("Engineering")).toBeInTheDocument();
    });

    expect(screen.getByText("All Groups")).toBeInTheDocument();
  });
});
