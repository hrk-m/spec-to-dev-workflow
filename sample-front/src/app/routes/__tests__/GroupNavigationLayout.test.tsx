import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GroupNavigationLayout } from "@/app/routes/GroupNavigationLayout";

vi.mock("@/pages/group-detail", () => ({
  GroupDetailPage: () => <div data-testid="group-detail-page">GroupDetailPage</div>,
  GroupDetailSheet: () => <div>GroupDetailSheet</div>,
  MemberDetailSheet: () => <div>MemberDetailSheet</div>,
}));

vi.mock("@/pages/home", () => ({
  HomePage: () => <div data-testid="home-page">HomePage</div>,
}));

vi.mock("@/shared/lib/sheet-stack", () => ({
  useSheetStack: () => ({ openSheet: vi.fn(), sheets: [] }),
}));

vi.mock("@/shared/ui", () => ({
  Sheet: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  sheetConstants: { baseZIndex: 100, fullWidth: "100%", defaultWidth: "600px" },
}));

function renderWithRouter(initialPath: string, state?: Record<string, unknown>) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: initialPath, state }]}>
      <Routes>
        <Route path="/*" element={<GroupNavigationLayout />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("GroupNavigationLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
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
});
