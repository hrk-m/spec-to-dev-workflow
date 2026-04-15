import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useNavigate } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupNavigationLayout } from "@/app/routes/GroupNavigationLayout";

const closeAll = vi.fn();

vi.mock("@/pages/group-detail", () => ({
  GroupDetailPage: () => <div data-testid="group-detail-page">GroupDetailPage</div>,
  GroupDetailSheet: () => <div>GroupDetailSheet</div>,
  MemberDetailSheet: () => <div>MemberDetailSheet</div>,
}));

vi.mock("@/pages/home", () => ({
  HomePage: () => <div data-testid="home-page">HomePage</div>,
}));

vi.mock("@/pages/users", () => ({
  UsersPage: () => <div data-testid="users-page">UsersPage</div>,
}));

vi.mock("@/shared/lib/sheet-stack", () => ({
  useSheetStack: () => ({ openSheet: vi.fn(), sheets: [], closeAll }),
}));

vi.mock("@/shared/ui", () => ({
  Sheet: ({
    children,
    headerActions,
  }: {
    children: React.ReactNode;
    headerActions?: React.ReactNode;
  }) => (
    <div>
      {headerActions}
      {children}
    </div>
  ),
  sheetConstants: { baseZIndex: 100, fullWidth: "100%", defaultWidth: "600px" },
}));

function renderWithRouter(initialPath: string, state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: initialPath, state }]}>
      <NavigateHomeButton />
      <Routes>
        <Route path="/*" element={<GroupNavigationLayout />} />
      </Routes>
    </MemoryRouter>,
  );
}

function NavigateHomeButton() {
  const navigate = useNavigate();

  return (
    <button type="button" onClick={() => navigate("/")}>
      Go Home
    </button>
  );
}

describe("GroupNavigationLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    closeAll.mockClear();
  });

  it("ホーム画面では HomePage に inert 属性がない", () => {
    renderWithRouter("/");

    const homePage = screen.getByTestId("home-page");
    expect(homePage.closest("[inert]")).toBeNull();
  });

  it("シート表示時に HomePage のラッパーに inert 属性がある", () => {
    renderWithRouter("/groups/1", { presentation: "sheet" });

    const homePage = screen.getByTestId("home-page");
    const inertWrapper = homePage.closest("[inert]");
    expect(inertWrapper).not.toBeNull();
    expect(inertWrapper).toHaveStyle({ display: "contents" });
  });

  it("state なしで /groups/:id にアクセスすると GroupDetailPage を表示する", () => {
    renderWithRouter("/groups/1");

    expect(screen.getByTestId("group-detail-page")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });

  it("/users では UsersPage を表示する", () => {
    renderWithRouter("/users");

    expect(screen.getByTestId("users-page")).toBeInTheDocument();
    expect(screen.queryByTestId("home-page")).not.toBeInTheDocument();
  });

  it("group-detail から離れると stacked sheets を閉じる", async () => {
    const user = userEvent.setup();

    renderWithRouter("/groups/1", { presentation: "sheet" });

    await user.click(screen.getByRole("button", { name: "Go Home" }));

    expect(closeAll).toHaveBeenCalledTimes(1);
  });

  it("GroupDetailRouteSheet の Sheet ヘッダーに ↗ ボタンがレンダリングされる", () => {
    renderWithRouter("/groups/1", { presentation: "sheet" });

    expect(screen.getByLabelText("Open full page")).toBeInTheDocument();
  });

  it("↗ ボタンクリックで navigate('/groups/1', { replace: true }) が呼ばれる", async () => {
    const user = userEvent.setup();

    renderWithRouter("/groups/1", { presentation: "sheet" });

    await user.click(screen.getByLabelText("Open full page"));

    // navigate は MemoryRouter 内の実 navigate が呼ばれる
    // /groups/1 へ replace: true で遷移すると state が消え sheet が非表示になる
    expect(screen.queryByLabelText("Open full page")).not.toBeInTheDocument();
  });
});
