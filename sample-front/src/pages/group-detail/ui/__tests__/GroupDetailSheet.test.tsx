import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroup } from "@/pages/group-detail/api/fetch-group";
import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { GroupDetail, MembersResponse } from "@/pages/group-detail/model/group-detail";
import { GroupDetailSheet } from "@/pages/group-detail/ui/GroupDetailSheet";

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
  });

  it("グループ名と説明を表示する", async () => {
    vi.mocked(fetchGroup).mockResolvedValueOnce(mockGroup);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<GroupDetailSheet groupId={1} />);

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

    render(<GroupDetailSheet groupId={1} />);

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

    render(<GroupDetailSheet groupId={1} onMemberClick={onMemberClick} />);

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
});
