import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroup } from "@/pages/group-detail/api/fetch-group";
import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { GroupDetail, MembersResponse } from "@/pages/group-detail/model/group-detail";
import { clearGroupDetailCache } from "@/pages/group-detail/model/group-detail-state";
import { clearMemberListCache } from "@/pages/group-detail/model/member-list";
import { GroupDetailPage } from "@/pages/group-detail/ui/GroupDetailPage";
import { SheetStackProvider } from "@/shared/lib/sheet-stack";

vi.mock("@/pages/group-detail/api/fetch-group", () => ({
  fetchGroup: vi.fn(),
}));

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
}));

const mockGroup: GroupDetail = {
  id: 1,
  name: "dev-team",
  description: "Development team",
  member_count: 5,
};

const mockMembersResponse: MembersResponse = {
  members: [
    { id: 1, first_name: "Taro", last_name: "Yamada" },
    { id: 2, first_name: "Hanako", last_name: "Sato" },
  ],
  total: 2,
};

function renderWithRouter(groupId = "1") {
  return render(
    <SheetStackProvider>
      <MemoryRouter initialEntries={[`/groups/${groupId}`]}>
        <Routes>
          <Route path="/groups/:id" element={<GroupDetailPage />} />
          <Route path="/" element={<div>Home Page</div>} />
        </Routes>
      </MemoryRouter>
    </SheetStackProvider>,
  );
}

describe("GroupDetailPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGroupDetailCache();
    clearMemberListCache();
  });

  it("ローディング中にスケルトンを表示する", () => {
    vi.mocked(fetchGroup).mockReturnValue(new Promise(() => {}));
    vi.mocked(fetchGroupMembers).mockReturnValue(new Promise(() => {}));

    renderWithRouter();

    expect(screen.getByText("Groups")).toBeInTheDocument();
  });

  it("グループ情報を表示する", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("dev-team")).toBeInTheDocument();
    });
    expect(screen.getByText("Development team")).toBeInTheDocument();
  });

  it("グループ情報カードに Name と Description を表示する", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });
    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("API エラー時にエラーメッセージを表示する", async () => {
    vi.mocked(fetchGroup).mockRejectedValueOnce(new Error("404 Not Found"));
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Error: 404 Not Found")).toBeInTheDocument();
    });
  });

  it("戻るボタンクリックで / に遷移する", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("dev-team")).toBeInTheDocument();
    });

    const backButton = screen.getByRole("button", { name: "Groups" });
    await user.click(backButton);

    await waitFor(() => {
      expect(screen.getByText("Home Page")).toBeInTheDocument();
    });
  });

  it("Members セクションヘッダーを表示する", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Members")).toBeInTheDocument();
    });
    expect(screen.getByText("5 total")).toBeInTheDocument();
  });

  it("メンバークリックで右シートにメンバー詳細を表示する", async () => {
    const user = userEvent.setup();

    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Yamada Taro"));

    await waitFor(() => {
      expect(screen.getByText("詳細は今後追加予定")).toBeInTheDocument();
    });
  });
});
