import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { MembersResponse } from "@/pages/group-detail/model/group-detail";
import { clearMemberListCache } from "@/pages/group-detail/model/member-list";
import { MemberList } from "@/pages/group-detail/ui/MemberList";

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
}));

const mockMembersResponse: MembersResponse = {
  members: [
    { id: 1, first_name: "Taro", last_name: "Yamada" },
    { id: 2, first_name: "Hanako", last_name: "Sato" },
  ],
  total: 2,
};

function createManyMembers(count: number): MembersResponse {
  const members = Array.from({ length: Math.min(count, 500) }, (_, i) => ({
    id: i + 1,
    first_name: `First${String(i + 1)}`,
    last_name: `Last${String(i + 1)}`,
  }));
  return { members, total: count };
}

describe("MemberList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMemberListCache();
  });

  it("ローディング中にスケルトンを表示する", () => {
    vi.mocked(fetchGroupMembers).mockReturnValue(new Promise(() => {}));

    render(<MemberList groupId={1} />);

    expect(screen.getByText("loading members...")).toBeInTheDocument();
  });

  it("メンバー一覧を表示する", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });
    expect(screen.getByText("Sato Hanako")).toBeInTheDocument();
  });

  it("メンバーのイニシャルアバターを表示する", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("YT")).toBeInTheDocument();
    });
    expect(screen.getByText("SH")).toBeInTheDocument();
  });

  it("API エラー時にエラーメッセージを表示する", async () => {
    vi.mocked(fetchGroupMembers).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });
  });

  it("メンバーが 0 人の場合は空メッセージを表示する", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce({ members: [], total: 0 });

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("No members found.")).toBeInTheDocument();
    });
  });

  it("ページネーション情報を表示する", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 1")).toBeInTheDocument();
    });
  });

  it("perPage 切り替えボタンを表示する", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    expect(screen.getByRole("button", { name: "20" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "50" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "100" })).toBeInTheDocument();
  });

  it("デフォルトで 20 件/ページ表示する", async () => {
    const manyMembers = createManyMembers(50);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(manyMembers);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    expect(screen.getByText("Last20 First20")).toBeInTheDocument();
    expect(screen.queryByText("Last21 First21")).not.toBeInTheDocument();
    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
  });

  it("perPage を 50 に切り替えられる", async () => {
    const user = userEvent.setup();
    const manyMembers = createManyMembers(100);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(manyMembers);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    const button50 = screen.getByRole("button", { name: "50" });
    await user.click(button50);

    await waitFor(() => {
      expect(screen.getByText("Last50 First50")).toBeInTheDocument();
    });
    expect(screen.queryByText("Last51 First51")).not.toBeInTheDocument();
  });

  it("検索入力でメンバーを検索できる", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers)
      .mockResolvedValueOnce(mockMembersResponse)
      .mockResolvedValueOnce({
        members: [{ id: 1, first_name: "Taro", last_name: "Yamada" }],
        total: 1,
      });

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search members");
    await user.clear(searchInput);
    await user.type(searchInput, "Yamada");

    await waitFor(() => {
      expect(vi.mocked(fetchGroupMembers)).toHaveBeenLastCalledWith(
        expect.objectContaining({ q: "Yamada" }),
      );
    });
  });

  it("onMemberClick が渡されたときメンバー行クリックで呼ばれる", async () => {
    const user = userEvent.setup();
    const onMemberClick = vi.fn();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} onMemberClick={onMemberClick} />);

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
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { unmount } = render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    unmount();

    render(<MemberList groupId={1} />);

    expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    expect(screen.queryByText("loading members...")).not.toBeInTheDocument();
  });

  it("2ページ目でも再表示時はキャッシュを使ってスケルトンを出さない", async () => {
    const user = userEvent.setup();
    const manyMembers = createManyMembers(50);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(manyMembers).mockReturnValueOnce(
      new Promise(() => {}),
    );

    const { unmount } = render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Last21 First21")).toBeInTheDocument();
    });

    unmount();

    render(<MemberList groupId={1} />);

    expect(screen.getByText("Last21 First21")).toBeInTheDocument();
    expect(screen.getByText("Last40 First40")).toBeInTheDocument();
    expect(screen.queryByText("loading members...")).not.toBeInTheDocument();
  });

  it("500 件キャッシュを超えるページに遷移すると offset=500 で追加フェッチする", async () => {
    const user = userEvent.setup();

    // 初回フェッチ: 500 件返却、total は 520（まだ残りがある）
    const initialResponse = createManyMembers(520);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(initialResponse);

    // 追加フェッチ: offset=500 から残り 20 件を返却
    const additionalMembers = Array.from({ length: 20 }, (_, i) => ({
      id: 501 + i,
      first_name: `First${String(501 + i)}`,
      last_name: `Last${String(501 + i)}`,
    }));
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce({
      members: additionalMembers,
      total: 520,
    });

    render(<MemberList groupId={1} />);

    // 初回フェッチ完了を待つ
    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    // perPage を 100 に切り替え（page=6 で startIndex=500 に到達できる）
    const button100 = screen.getByRole("button", { name: "100" });
    await user.click(button100);

    // Next ボタンを 5 回クリックして page 6 に到達（startIndex=500, endIndex=600）
    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);
    await user.click(nextButton);

    // 追加フェッチが offset=500 で呼ばれたことを検証
    await waitFor(() => {
      expect(vi.mocked(fetchGroupMembers)).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 1, offset: 500, limit: 500 }),
      );
    });
  });

  it("Next / Previous ボタンでページを切り替えられる", async () => {
    const user = userEvent.setup();
    const manyMembers = createManyMembers(50);
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(manyMembers);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });

    const nextButton = screen.getByRole("button", { name: "Next" });
    await user.click(nextButton);

    await waitFor(() => {
      expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    });
    expect(screen.getByText("Last21 First21")).toBeInTheDocument();

    const prevButton = screen.getByRole("button", { name: "Previous" });
    await user.click(prevButton);

    await waitFor(() => {
      expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    });
  });

  it("検索で 0 件のとき API の total が全件数でもページネーションを非表示にする", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse).mockResolvedValueOnce({
      members: [],
      total: 31,
    });

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const searchInput = screen.getByPlaceholderText("Search members");
    await user.clear(searchInput);
    await user.type(searchInput, "nonexistent");

    await waitFor(() => {
      expect(screen.getByText("No members found.")).toBeInTheDocument();
    });

    expect(screen.queryByText(/Page \d+ of \d+/)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Next" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Previous" })).not.toBeInTheDocument();
  });

  it("検索入力がデバウンスされ、最後の入力から 300ms 後にフェッチが発火する", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers)
      .mockResolvedValueOnce(mockMembersResponse)
      .mockResolvedValueOnce({
        members: [{ id: 1, first_name: "Taro", last_name: "Yamada" }],
        total: 1,
      });

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const initialCallCount = vi.mocked(fetchGroupMembers).mock.calls.length;

    const searchInput = screen.getByPlaceholderText("Search members");
    await user.type(searchInput, "Yamada");

    // デバウンス後にフェッチが発火する（300ms 後）
    await waitFor(() => {
      expect(vi.mocked(fetchGroupMembers).mock.calls.length).toBeGreaterThan(initialCallCount);
    });

    // 文字ごとに個別フェッチされるのではなく、デバウンス後にまとめて 1 回だけ発火する
    const searchCalls = vi.mocked(fetchGroupMembers).mock.calls.slice(initialCallCount);
    expect(searchCalls).toHaveLength(1);
    expect(vi.mocked(fetchGroupMembers)).toHaveBeenLastCalledWith(
      expect.objectContaining({ q: "Yamada" }),
    );
  });
});
