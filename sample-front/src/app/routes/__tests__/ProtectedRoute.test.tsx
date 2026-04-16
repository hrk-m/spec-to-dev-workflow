import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { ProtectedRoute } from "@/app/routes/ProtectedRoute";
import { HttpError } from "@/shared/api";
import { AuthProvider } from "@/shared/auth";

// vi.mock is hoisted — use vi.hoisted to create mock references
const mockApiFetch = vi.hoisted(() => vi.fn());
const mockSetUser = vi.hoisted(() => vi.fn());

vi.mock("@/shared/api/client", () => {
  class MockHttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "HttpError";
      this.status = status;
    }
  }
  return {
    apiFetch: mockApiFetch,
    HttpError: MockHttpError,
  };
});

vi.mock("@/shared/api", () => {
  class MockHttpError extends Error {
    status: number;
    constructor(status: number, message: string) {
      super(message);
      this.name = "HttpError";
      this.status = status;
    }
  }
  return {
    apiFetch: mockApiFetch,
    HttpError: MockHttpError,
  };
});

vi.mock("@/shared/auth", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  useAuth: () => ({ user: null, setUser: mockSetUser }),
}));

// /service-unavailable へ遷移したとき location.state を検証できるヘルパーコンポーネント
function ServiceUnavailableCapture() {
  const location = useLocation();
  const reason = (location.state as { reason?: string } | null)?.reason ?? "none";
  return (
    <div data-testid="service-unavailable" data-reason={reason}>
      DevLogin
    </div>
  );
}

function renderWithRouter(ui: React.ReactElement, initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <AuthProvider>
        <Routes>
          <Route path="/*" element={ui} />
          <Route path="/service-unavailable" element={<ServiceUnavailableCapture />} />
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  );
}

describe("ProtectedRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("GET /api/v1/me が 200 を返すとユーザー情報が setUser に渡される（firstName/lastName マッピング確認）", async () => {
    const meResponse = {
      id: 1,
      uuid: "test-uuid",
      first_name: "太郎",
      last_name: "山田",
    };
    mockApiFetch.mockResolvedValueOnce(meResponse);

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("protected-content")).toBeInTheDocument();
    });

    expect(mockSetUser).toHaveBeenCalledWith({
      id: 1,
      uuid: "test-uuid",
      firstName: "太郎",
      lastName: "山田",
    });
  });

  it("GET /api/v1/me が 401 を返すと reason='unauthenticated' で /service-unavailable へリダイレクトされる", async () => {
    mockApiFetch.mockRejectedValueOnce(new HttpError(401, "401 Unauthorized"));

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("service-unavailable")).toBeInTheDocument();
    });

    expect(screen.getByTestId("service-unavailable")).toHaveAttribute(
      "data-reason",
      "unauthenticated",
    );
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });

  it("GET /api/v1/me がネットワークエラーを返すと reason='api_unavailable' で /service-unavailable へリダイレクトされる", async () => {
    mockApiFetch.mockRejectedValueOnce(new Error("Network Error"));

    renderWithRouter(
      <ProtectedRoute>
        <div data-testid="protected-content">Protected</div>
      </ProtectedRoute>,
    );

    await waitFor(() => {
      expect(screen.getByTestId("service-unavailable")).toBeInTheDocument();
    });

    expect(screen.getByTestId("service-unavailable")).toHaveAttribute(
      "data-reason",
      "api_unavailable",
    );
    expect(screen.queryByTestId("protected-content")).not.toBeInTheDocument();
  });
});
