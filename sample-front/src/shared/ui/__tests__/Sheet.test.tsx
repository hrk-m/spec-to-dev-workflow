import { act, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { Sheet, sheetConstants } from "@/shared/ui";

describe("Sheet", () => {
  it("radix theme スコープ内に portal される", () => {
    const host = document.createElement("div");
    host.className = "radix-themes";
    document.body.appendChild(host);

    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    expect(host).toContainElement(screen.getByRole("dialog"));

    host.remove();
  });

  it("children が正しくレンダリングされる", () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    expect(screen.getByText("Sheet content")).toBeInTheDocument();
  });

  it("x ボタンクリックで onClose が呼ばれる", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();

    render(
      <Sheet onClose={onClose} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    const closeButton = screen.getByRole("button", { name: "Close" });
    await user.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ESC キーで onClose が呼ばれる", () => {
    const onClose = vi.fn();

    render(
      <Sheet onClose={onClose} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("最前面でないシートは ESC キーで onClose が呼ばれない", () => {
    const onClose = vi.fn();

    render(
      <Sheet onClose={onClose} onRemove={vi.fn()} isTopMost={false}>
        <p>Sheet content</p>
      </Sheet>,
    );

    fireEvent.keyDown(document, { key: "Escape" });

    expect(onClose).not.toHaveBeenCalled();
  });

  it("マウント時に translateX(100%) から translateX(0) へアニメーションする", async () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog");

    // Initial state before requestAnimationFrame fires
    expect(dialog.style.transform).toBe("translateX(100%)");

    // Flush requestAnimationFrame (jsdom backs rAF with setTimeout)
    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    });

    expect(dialog.style.transform).toBe("translateX(0)");
  });

  it("closing=true で translateX(100%) が適用される", async () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()} closing>
        <p>Sheet content</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog");

    // Even after mount, closing should override to translateX(100%)
    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
    });

    expect(dialog.style.transform).toBe("translateX(100%)");
  });

  it("closing=true のときに transitionend で onRemove が呼ばれる", () => {
    const onRemove = vi.fn();

    render(
      <Sheet onClose={vi.fn()} onRemove={onRemove} closing>
        <p>Sheet content</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog");

    fireEvent.transitionEnd(dialog);

    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("closing=false のときに transitionend で onRemove が呼ばれない", () => {
    const onRemove = vi.fn();

    render(
      <Sheet onClose={vi.fn()} onRemove={onRemove}>
        <p>Sheet content</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog");

    fireEvent.transitionEnd(dialog);

    expect(onRemove).not.toHaveBeenCalled();
  });

  it("width prop が渡されたときはその幅で描画される", () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()} width="100vw">
        <p>Sheet content</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog");

    expect(dialog.style.width).toBe("100vw");
  });

  it("ヘッダーを隠さないようにシートはヘッダー下から表示される", () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    const dialog = screen.getByRole("dialog");
    const overlay = screen.getByTestId("sheet-overlay");

    expect(dialog.style.top).toBe(sheetConstants.topOffset);
    expect(dialog.style.height).toBe(sheetConstants.height);
    expect(overlay).toHaveStyle({
      top: sheetConstants.topOffset,
      height: sheetConstants.height,
    });
  });

  it("マウント時に document.body.style.overflow が変更されない", () => {
    document.body.style.overflow = "";

    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    expect(document.body.style.overflow).toBe("");
  });

  it("マウント直後（rAF 前）に overlay の opacity が 0 である", () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    const overlay = screen.getByTestId("sheet-overlay");

    expect(overlay.style.opacity).toBe("0");
  });

  it("マウント後（rAF 実行後）に overlay の opacity が 1 になる", async () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()}>
        <p>Sheet content</p>
      </Sheet>,
    );

    const overlay = screen.getByTestId("sheet-overlay");

    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    });

    expect(overlay.style.opacity).toBe("1");
  });

  it("closing=true のときに overlay の opacity が 0 になる", async () => {
    render(
      <Sheet onClose={vi.fn()} onRemove={vi.fn()} closing>
        <p>Sheet content</p>
      </Sheet>,
    );

    const overlay = screen.getByTestId("sheet-overlay");

    await act(async () => {
      await new Promise((resolve) => {
        requestAnimationFrame(resolve);
      });
    });

    expect(overlay.style.opacity).toBe("0");
  });

  it("headerActions prop が渡されたとき × ボタンの左隣にレンダリングされる", () => {
    render(
      <Sheet
        onClose={vi.fn()}
        onRemove={vi.fn()}
        headerActions={<button aria-label="test-action">action</button>}
      >
        <p>Sheet content</p>
      </Sheet>,
    );

    const actionButton = screen.getByLabelText("test-action");
    const closeButton = screen.getByLabelText("Close");

    expect(actionButton).toBeInTheDocument();

    // headerActions ボタンが Close ボタンより前に DOM に現れることを確認
    const position =
      actionButton.compareDocumentPosition(closeButton) & Node.DOCUMENT_POSITION_FOLLOWING;
    expect(position).toBeTruthy();
  });
});
