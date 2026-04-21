import { MockIntersectionObserver } from "@/test/setup";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import * as deleteGroupMembersModule from "@/pages/group-detail/api/delete-group-members";
import { fetchGroupMembers } from "@/pages/group-detail/api/fetch-group-members";
import type { MembersResponse } from "@/pages/group-detail/model/group-detail";
import { clearMemberListCache, FETCH_LIMIT } from "@/pages/group-detail/model/member-list";
import * as memberList from "@/pages/group-detail/model/member-list";
import { MemberList } from "@/pages/group-detail/ui/MemberList";

vi.mock("@/pages/group-detail/api/fetch-group-members", () => ({
  fetchGroupMembers: vi.fn(),
}));

vi.mock("@/pages/group-detail/api/delete-group-members", () => ({
  deleteGroupMembers: vi.fn(),
}));

const mockMembersResponse: MembersResponse = {
  members: [
    { id: 1, first_name: "Taro", last_name: "Yamada" },
    { id: 2, first_name: "Hanako", last_name: "Sato" },
  ],
  total: 2,
};

describe("MemberList", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearMemberListCache();
    MockIntersectionObserver.reset();
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

  it("列ヘッダー id と 姓名 が columnheader ロールで取得できる", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    expect(screen.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "姓名" })).toBeInTheDocument();
  });

  it("onRefetch 渡し時に 選択・id・姓名 の 3 列ヘッダーがすべて columnheader ロールで取得できる", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} onRefetch={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    expect(screen.getByRole("columnheader", { name: "id" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "姓名" })).toBeInTheDocument();
    // 選択列ヘッダーは aria-label="選択" を持つ <th> 要素として存在する
    const selectionHeader = document.querySelector('th[aria-label="選択"]');
    expect(selectionHeader).toBeInTheDocument();
  });

  it("アバターアイコン（イニシャル円形）が DOM に存在しない", async () => {
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    // イニシャル（YT, SH）が DOM に存在しないことを確認
    expect(screen.queryByText("YT")).not.toBeInTheDocument();
    expect(screen.queryByText("SH")).not.toBeInTheDocument();
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

  it("ページネーション UI（Previous/Next ボタン・件数セレクタ）が存在しない", async () => {
    const manyMembers: MembersResponse = {
      members: Array.from({ length: 50 }, (_, i) => ({
        id: i + 1,
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      })),
      total: 50,
    };
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(manyMembers);

    render(<MemberList groupId={1} />);

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
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByTestId("member-sentinel")).toBeInTheDocument();
    });
  });

  it("fetch 後に cachedMembers の全件が表示される", async () => {
    const manyMembers: MembersResponse = {
      members: Array.from({ length: 55 }, (_, i) => ({
        id: i + 1,
        first_name: `First${String(i + 1)}`,
        last_name: `Last${String(i + 1)}`,
      })),
      total: 55,
    };
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(manyMembers);

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    // DISPLAY_STEP 廃止後は全件即時表示される
    expect(screen.getByText("Last51 First51")).toBeInTheDocument();
    expect(screen.getByText("Last55 First55")).toBeInTheDocument();
  });

  it("再表示時はキャッシュを使ってスケルトンを出さない", async () => {
    vi.mocked(fetchGroupMembers)
      .mockResolvedValueOnce(mockMembersResponse)
      .mockReturnValueOnce(new Promise(() => {}));

    const { unmount } = render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    unmount();

    render(<MemberList groupId={1} />);

    expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    expect(screen.queryByText("loading members...")).not.toBeInTheDocument();
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

  it("sentinel が visible になったとき lastBatchSize === FETCH_LIMIT なら次 offset でフェッチする", async () => {
    const initialMembers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
      id: i + 1,
      first_name: `First${String(i + 1)}`,
      last_name: `Last${String(i + 1)}`,
    }));
    const additionalMembers = [{ id: FETCH_LIMIT + 1, first_name: "Extra", last_name: "Member" }];

    vi.mocked(fetchGroupMembers)
      .mockResolvedValueOnce({ members: initialMembers, total: FETCH_LIMIT + 1 })
      .mockResolvedValueOnce({ members: additionalMembers, total: FETCH_LIMIT + 1 });

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
    });

    // Trigger sentinel: lastBatchSize === FETCH_LIMIT → doFetchMore fires
    act(() => {
      MockIntersectionObserver.triggerAll([
        { isIntersecting: true, target: document.createElement("div") },
      ]);
    });

    await waitFor(() => {
      expect(vi.mocked(fetchGroupMembers)).toHaveBeenCalledWith(
        expect.objectContaining({ groupId: 1, offset: FETCH_LIMIT }),
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

  it("追加フェッチ失敗時にリスト末尾にエラーメッセージが表示され、既存アイテムは維持される", async () => {
    const initialMembers = Array.from({ length: FETCH_LIMIT }, (_, i) => ({
      id: i + 1,
      first_name: `First${String(i + 1)}`,
      last_name: `Last${String(i + 1)}`,
    }));

    vi.mocked(fetchGroupMembers)
      .mockResolvedValueOnce({ members: initialMembers, total: FETCH_LIMIT + 10 })
      .mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<MemberList groupId={1} />);

    await waitFor(() => {
      expect(screen.getByText("Last1 First1")).toBeInTheDocument();
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
    expect(screen.getByText("Last1 First1")).toBeInTheDocument();
  });

  it("検索で 0 件のとき ページネーション UI が存在しない", async () => {
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

describe("MemberList - メンバー削除", () => {
  let clearCacheSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    vi.clearAllMocks();
    clearMemberListCache();
    MockIntersectionObserver.reset();
    clearCacheSpy = vi.spyOn(memberList, "clearMemberListCache");
  });

  afterEach(() => {
    clearCacheSpy.mockRestore();
  });

  it("0 件チェック時は削除ボタンが disabled、1 件以上で enabled になる", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} onRefetch={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const deleteButton = screen.getByRole("button", { name: "削除" });
    expect(deleteButton).toBeDisabled();

    const firstCheckbox = screen.getAllByRole("checkbox")[0] as Element;
    await user.click(firstCheckbox);

    expect(deleteButton).not.toBeDisabled();
  });

  it("削除ボタン押下で確認ダイアログが開く", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} onRefetch={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const firstCheckbox = screen.getAllByRole("checkbox")[0] as Element;
    await user.click(firstCheckbox);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/選択した.*名をグループから削除しますか/)).toBeInTheDocument();
    });
  });

  it("削除成功後に clearMemberListCache と onRefetch が呼ばれ、チェック状態がリセットされる", async () => {
    const user = userEvent.setup();
    const onRefetch = vi.fn();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);
    vi.mocked(deleteGroupMembersModule.deleteGroupMembers).mockResolvedValueOnce(undefined);

    render(<MemberList groupId={1} onRefetch={onRefetch} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const firstCheckbox = screen.getAllByRole("checkbox")[0] as Element;
    await user.click(firstCheckbox);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "削除する" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(clearCacheSpy).toHaveBeenCalled();
      expect(onRefetch).toHaveBeenCalled();
    });

    // チェック状態がリセットされ削除ボタンが再び disabled になる
    await waitFor(() => {
      expect(screen.getByRole("button", { name: "削除" })).toBeDisabled();
    });
  });

  it("キャンセルでダイアログが閉じ、チェック状態が維持される", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);

    render(<MemberList groupId={1} onRefetch={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const firstCheckbox = screen.getAllByRole("checkbox")[0] as Element;
    await user.click(firstCheckbox);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    await waitFor(() => {
      expect(screen.getByText(/選択した.*名をグループから削除しますか/)).toBeInTheDocument();
    });

    const cancelButton = screen.getByRole("button", { name: "キャンセル" });
    await user.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText(/選択した.*名をグループから削除しますか/)).not.toBeInTheDocument();
    });

    // 削除ボタンはまだ enabled（チェック状態が維持されている）
    expect(screen.getByRole("button", { name: "削除" })).not.toBeDisabled();
  });

  it("4xx/5xx エラー時にエラーメッセージを表示する", async () => {
    const user = userEvent.setup();
    vi.mocked(fetchGroupMembers).mockResolvedValueOnce(mockMembersResponse);
    vi.mocked(deleteGroupMembersModule.deleteGroupMembers).mockRejectedValueOnce(
      new Error("500 Internal Server Error"),
    );

    render(<MemberList groupId={1} onRefetch={vi.fn()} />);

    await waitFor(() => {
      expect(screen.getByText("Yamada Taro")).toBeInTheDocument();
    });

    const firstCheckbox = screen.getAllByRole("checkbox")[0] as Element;
    await user.click(firstCheckbox);

    const deleteButton = screen.getByRole("button", { name: "削除" });
    await user.click(deleteButton);

    const confirmButton = screen.getByRole("button", { name: "削除する" });
    await user.click(confirmButton);

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });
  });
});
