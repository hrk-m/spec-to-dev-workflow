import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupNavigationLayout } from "@/app/routes/GroupNavigationLayout";
import { SheetStackProvider } from "@/shared/lib/sheet-stack";
import { sheetConstants } from "@/shared/ui";

vi.mock("@/pages/home", () => ({
  HomePage: ({ onGroupClick }: { onGroupClick?: (groupId: number) => void }) => (
    <div>
      <div>Home Page Mock</div>
      <button type="button" onClick={() => onGroupClick?.(29)}>
        Open Group 29
      </button>
    </div>
  ),
}));

vi.mock("@/pages/group-detail", () => ({
  GroupDetailPage: () => <div>Group Detail Page Mock</div>,
  GroupDetailSheet: ({
    groupId,
    onMemberClick,
  }: {
    groupId: number;
    onMemberClick?: (member: { id: number; first_name: string; last_name: string }) => void;
  }) => (
    <div>
      <div>Group Detail Sheet Mock {groupId}</div>
      <button
        type="button"
        onClick={() => onMemberClick?.({ id: 1, first_name: "Taro", last_name: "Yamada" })}
      >
        Open Member
      </button>
    </div>
  ),
  MemberDetailSheet: ({ member }: { member: { first_name: string; last_name: string } }) => (
    <div>
      Member Sheet {member.last_name} {member.first_name}
    </div>
  ),
}));

function LocationProbe() {
  const location = useLocation();

  return <div data-testid="location-path">{location.pathname}</div>;
}

function renderWithRouter(
  initialEntries:
    | string[]
    | Array<string | { pathname: string; state?: { presentation?: "sheet" } }> = ["/"],
  initialIndex?: number,
) {
  return render(
    <MemoryRouter initialEntries={initialEntries} initialIndex={initialIndex}>
      <SheetStackProvider>
        <LocationProbe />
        <Routes>
          <Route element={<GroupNavigationLayout />}>
            <Route index element={<></>} />
            <Route path="groups" element={<></>} />
            <Route path="groups/:id" element={<></>} />
          </Route>
        </Routes>
      </SheetStackProvider>
    </MemoryRouter>,
  );
}

describe("GroupNavigationLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("一覧クリックで /groups/:id に遷移し、シート表示する", async () => {
    const user = userEvent.setup();

    renderWithRouter(["/"]);

    expect(screen.getByText("Home Page Mock")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Group 29" }));

    await waitFor(() => {
      expect(screen.getByTestId("location-path")).toHaveTextContent("/groups/29");
    });

    expect(screen.getByText("Home Page Mock")).toBeInTheDocument();
    expect(screen.getByText("Group Detail Sheet Mock 29")).toBeInTheDocument();
    expect(screen.queryByText("Group Detail Page Mock")).not.toBeInTheDocument();
  });

  it("直リンクの /groups/:id は full page 表示する", () => {
    renderWithRouter(["/groups/29"]);

    expect(screen.getByTestId("location-path")).toHaveTextContent("/groups/29");
    expect(screen.getByText("Group Detail Page Mock")).toBeInTheDocument();
    expect(screen.queryByText("Home Page Mock")).not.toBeInTheDocument();
    expect(screen.queryByText("Group Detail Sheet Mock 29")).not.toBeInTheDocument();
  });

  it("シートを閉じると前の一覧 URL に戻る", async () => {
    const user = userEvent.setup();

    renderWithRouter(["/groups", { pathname: "/groups/29", state: { presentation: "sheet" } }], 1);

    expect(screen.getByText("Group Detail Sheet Mock 29")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.transitionEnd(screen.getByRole("dialog"));

    await waitFor(() => {
      expect(screen.getByTestId("location-path")).toHaveTextContent("/groups");
    });
  });

  it("一覧経由のグループシートからメンバーシートも開ける", async () => {
    const user = userEvent.setup();

    renderWithRouter(["/groups", { pathname: "/groups/29", state: { presentation: "sheet" } }], 1);

    await user.click(screen.getByRole("button", { name: "Open Member" }));

    await waitFor(() => {
      expect(screen.getByText("Member Sheet Yamada Taro")).toBeInTheDocument();
    });
  });

  it("メンバーシート表示中は背景のグループ詳細シートが 100vw になる", async () => {
    const user = userEvent.setup();

    renderWithRouter(["/groups", { pathname: "/groups/29", state: { presentation: "sheet" } }], 1);

    const [groupDialogBeforeOpen] = screen.getAllByRole("dialog");
    expect(groupDialogBeforeOpen).toHaveStyle({ width: sheetConstants.defaultWidth });

    await user.click(screen.getByRole("button", { name: "Open Member" }));

    await waitFor(() => {
      expect(screen.getByText("Member Sheet Yamada Taro")).toBeInTheDocument();
    });

    const [groupDialogAfterOpen, memberDialog] = screen.getAllByRole("dialog");
    expect(groupDialogAfterOpen).toHaveStyle({ width: sheetConstants.fullWidth });
    expect(memberDialog).toHaveStyle({ width: sheetConstants.defaultWidth });
  });

  it("メンバーシート表示中は前面 overlay が背景グループ詳細より上に来る", async () => {
    const user = userEvent.setup();

    renderWithRouter(["/groups", { pathname: "/groups/29", state: { presentation: "sheet" } }], 1);

    await user.click(screen.getByRole("button", { name: "Open Member" }));

    await waitFor(() => {
      expect(screen.getByText("Member Sheet Yamada Taro")).toBeInTheDocument();
    });

    const [groupDialog] = screen.getAllByRole("dialog");
    const overlays = screen.getAllByTestId("sheet-overlay");
    const topOverlay = overlays[overlays.length - 1];

    expect(groupDialog).toHaveStyle({ zIndex: String(sheetConstants.baseZIndex - 1) });
    expect(topOverlay).toHaveStyle({ zIndex: String(sheetConstants.baseZIndex) });
  });
});
