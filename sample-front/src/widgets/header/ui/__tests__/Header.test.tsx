import { Header } from "@/widgets/header";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

describe("Header", () => {
  it("画面タイトルを表示する", () => {
    render(<Header />);

    expect(screen.getByText("Sample Front")).toBeInTheDocument();
  });

  it("アカウント表示を表示する", () => {
    render(<Header />);

    expect(screen.getByLabelText("Account")).toBeInTheDocument();
  });

  it("ハンバーガーメニューを表示する", () => {
    render(<Header />);

    expect(screen.getByLabelText("Open navigation")).toBeInTheDocument();
  });

  it("banner ロールを持つ", () => {
    render(<Header />);

    expect(screen.getByRole("banner")).toBeInTheDocument();
  });

  it("メニューボタンをクリックすると onMenuClick が呼ばれる", () => {
    const onMenuClick = vi.fn();
    render(<Header onMenuClick={onMenuClick} />);

    fireEvent.click(screen.getByLabelText("Open navigation"));
    expect(onMenuClick).toHaveBeenCalledTimes(1);
  });
});
