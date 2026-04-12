import { Sidebar } from "@/widgets/sidebar";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

function renderSidebar(props: {
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (path: string) => void;
}) {
  return render(<Sidebar {...props} />);
}

describe("Sidebar", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
  };

  it("isOpen が true のとき navigation ロールを表示する", () => {
    renderSidebar(defaultProps);

    expect(screen.getByRole("navigation")).toBeInTheDocument();
  });

  it("isOpen が false のとき navigation を描画しない", () => {
    renderSidebar({ ...defaultProps, isOpen: false });

    expect(screen.queryByRole("navigation")).not.toBeInTheDocument();
  });

  it("Groups メニュー項目を表示する", () => {
    renderSidebar(defaultProps);

    expect(screen.getByText("Groups")).toBeInTheDocument();
  });

  it("Users メニュー項目を表示する", () => {
    renderSidebar(defaultProps);

    expect(screen.getByText("Users")).toBeInTheDocument();
  });

  it("isOpen が true のときオーバーレイを表示する", () => {
    renderSidebar({ ...defaultProps, isOpen: true });

    const overlay = screen.getByTestId("sidebar-overlay");
    expect(overlay).toBeInTheDocument();
  });

  it("isOpen が false のときオーバーレイを描画しない", () => {
    renderSidebar({ ...defaultProps, isOpen: false });

    expect(screen.queryByTestId("sidebar-overlay")).not.toBeInTheDocument();
  });

  it("オーバーレイをクリックすると onClose が呼ばれる", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    fireEvent.click(screen.getByTestId("sidebar-overlay"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Groups をクリックすると onClose が呼ばれる", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    fireEvent.click(screen.getByText("Groups"));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("Groups をクリックすると onNavigate が呼ばれる", () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    renderSidebar({ isOpen: true, onClose, onNavigate });

    fireEvent.click(screen.getByText("Groups"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/");
  });

  it("onNavigate が未指定でも Groups クリックでエラーにならない", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    expect(() => {
      fireEvent.click(screen.getByText("Groups"));
    }).not.toThrow();
  });

  it("Users をクリックすると onNavigate に /users を渡す", () => {
    const onClose = vi.fn();
    const onNavigate = vi.fn();
    renderSidebar({ isOpen: true, onClose, onNavigate });

    fireEvent.click(screen.getByText("Users"));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledTimes(1);
    expect(onNavigate).toHaveBeenCalledWith("/users");
  });

  it("Escape キーで閉じる", () => {
    const onClose = vi.fn();
    renderSidebar({ isOpen: true, onClose });

    fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
