import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/shared/api/client";
import { HomePage } from "../HomePage";

vi.mock("@/shared/api/client", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../GroupList", () => ({
  GroupList: () => <div>mock group list</div>,
}));

describe("HomePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("初期表示で loading... を表示する", () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}));

    render(<HomePage />);

    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("API が成功した場合はメッセージを表示する", async () => {
    vi.mocked(apiFetch).mockResolvedValueOnce({ message: "Hello, World!" });

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Hello, World!")).toBeInTheDocument();
    });
    expect(screen.queryByText("loading...")).not.toBeInTheDocument();
  });

  it("API がエラーの場合はエラーメッセージを表示する", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("500 Internal Server Error"));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.getByText("Error: 500 Internal Server Error")).toBeInTheDocument();
    });
  });

  it("エラー時は loading... を非表示にする", async () => {
    vi.mocked(apiFetch).mockRejectedValueOnce(new Error("Network Error"));

    render(<HomePage />);

    await waitFor(() => {
      expect(screen.queryByText("loading...")).not.toBeInTheDocument();
    });
  });

  it("タイトルを表示する", () => {
    vi.mocked(apiFetch).mockReturnValue(new Promise(() => {}));

    render(<HomePage />);

    expect(screen.getByRole("heading", { name: "sample-front" })).toBeInTheDocument();
  });
});
