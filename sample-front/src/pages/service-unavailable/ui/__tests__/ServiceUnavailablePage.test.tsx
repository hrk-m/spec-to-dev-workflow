import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ServiceUnavailablePage } from "@/pages/service-unavailable";

// vi.mock is hoisted — use vi.hoisted to create mock references
const mockApiFetch = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/client", () => {
  class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "HttpError";
      this.status = status;
    }
  }
  return {
    apiFetch: mockApiFetch,
    HttpError,
  };
});

vi.mock("@/shared/api", () => {
  class HttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "HttpError";
      this.status = status;
    }
  }
  return {
    apiFetch: mockApiFetch,
    HttpError,
  };
});

function renderWithRouter() {
  return render(
    <MemoryRouter initialEntries={["/service-unavailable"]}>
      <Routes>
        <Route path="/service-unavailable" element={<ServiceUnavailablePage />} />
        <Route path="/" element={<div data-testid="home">Home</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

describe("ServiceUnavailablePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("ローディング中は何も表示されない（null）", () => {
    mockApiFetch.mockReturnValue(new Promise(() => {}));
    renderWithRouter();
    expect(screen.queryByText("ただいまメンテナンス中です。")).not.toBeInTheDocument();
    expect(screen.queryByTestId("home")).not.toBeInTheDocument();
  });

  it("GET /api/v1/me が 200 を返すと / へリダイレクトされる", async () => {
    mockApiFetch.mockResolvedValueOnce({
      id: 1,
      uuid: "test-uuid",
      first_name: "太郎",
      last_name: "山田",
    });

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByTestId("home")).toBeInTheDocument();
    });
  });

  it("エラー時に「ただいまメンテナンス中です。」が表示される", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network Error"));

    renderWithRouter();

    await waitFor(() => {
      expect(screen.getByText("ただいまメンテナンス中です。")).toBeInTheDocument();
    });
  });

  it("エラー時に本文メッセージが表示される", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network Error"));

    renderWithRouter();

    await waitFor(() => {
      expect(
        screen.getByText(
          "ご迷惑をおかけし申し訳ありません。しばらくしてから再度アクセスしてください。",
        ),
      ).toBeInTheDocument();
    });
  });
});
