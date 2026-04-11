import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroup } from "@/pages/group-detail/api/fetch-group";
import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { GroupDetail, MembersResponse } from "@/pages/group-detail/model/group-detail";
import { clearGroupDetailCache } from "@/pages/group-detail/model/group-detail-state";
import { clearMemberListCache } from "@/pages/group-detail/model/member-list";
import { GroupDetailSheet } from "@/pages/group-detail/ui/GroupDetailSheet";

vi.mock("@/pages/group-detail/api/fetch-group", () => ({
  fetchGroup: vi.fn(),
}));

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
}));

vi.mock("@/shared/lib/sheet-stack", () => ({
  useSheetStack: vi.fn(() => ({
    openSheet: vi.fn(),
    closeSheet: vi.fn(),
    sheets: [],
  })),
}));

const mockGroup: GroupDetail = {
  id: 1,
  name: "dev-team",
  description: "Development team",
  member_count: 2,
};

const mockMembersResponse: MembersResponse = {
  members: [
    { id: 1, first_name: "Taro", last_name: "Yamada" },
    { id: 2, first_name: "Hanako", last_name: "Sato" },
  ],
  total: 2,
};

describe("GroupDetailSheet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearGroupDetailCache();
    clearMemberListCache();
  });

  it("グループ名と説明を表示する", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(
      <MemoryRouter>
        <GroupDetailSheet groupId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("dev-team")).toBeInTheDocument();
    });
    expect(screen.getByText("Development team")).toBeInTheDocument();
    expect(screen.getByText("Members")).toBeInTheDocument();
    expect(screen.getByText("2 total")).toBeInTheDocument();
  });

  it("ページ詳細と同じ Name / Description カードを表示する", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(
      <MemoryRouter>
        <GroupDetailSheet groupId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Name")).toBeInTheDocument();
    });

    expect(screen.getByText("Description")).toBeInTheDocument();
  });

  it("メンバークリックを親へ伝播する", async () => {
    const user = userEvent.setup();
    const onMemberClick = vi.fn();

    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(
      <MemoryRouter>
        <GroupDetailSheet groupId={1} onMemberClick={onMemberClick} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    await user.click(screen.getByText("Yamada Taro"));

    expect(onMemberClick).toHaveBeenCalledTimes(1);
    expect(onMemberClick).toHaveBeenCalledWith({
      id: 1,
      first_name: "Taro",
      last_name: "Yamada",
    });
  });

  it("再表示時はキャッシュを使ってスケルトンを出さない", async () => {
    vi.mocked(fetchGroup)
      .mockResolvedValueOnce(mockGroup)
      .mockReturnValueOnce(new Promise(() => {}));
    vi.mocked(fetchGroupMembers)
      .mockResolvedValueOnce(mockMembersResponse)
      .mockReturnValueOnce(new Promise(() => {}));

    const { unmount } = render(
      <MemoryRouter>
        <GroupDetailSheet groupId={1} />
      </MemoryRouter>,
    );

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    unmount();

    render(
      <MemoryRouter>
        <GroupDetailSheet groupId={1} />
      </MemoryRouter>,
    );

    expect(screen.getByText("dev-team")).toBeInTheDocument();
    expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    expect(screen.queryByText("loading group...")).not.toBeInTheDocument();
    expect(screen.queryByText("loading members...")).not.toBeInTheDocument();
  });
});
