import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { createGroup } from "@/pages/home/api/create-group";
import { useCreateGroup } from "@/pages/home/model/useCreateGroup";

vi.mock("@/pages/home/api/create-group", () => ({
  createGroup: vi.fn(),
}));

const { prependGroupToGroupListCache } = vi.hoisted(() => ({
  prependGroupToGroupListCache: vi.fn(),
}));
vi.mock("@/pages/home/model/group-list", () => ({
  prependGroupToGroupListCache,
}));

const mockNavigate = vi.fn();
vi.mock("react-router", () => ({
  useNavigate: () => mockNavigate,
}));

describe("useCreateGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("デフォルト状態は isLoading=false, error=null, nameError=null", () => {
    const { result } = renderHook(() => useCreateGroup());

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.nameError).toBeNull();
  });

  it("submit 後に isLoading=true になる", () => {
    vi.mocked(createGroup).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useCreateGroup());

    act(() => {
      result.current.submit({ name: "Test Group", description: "desc" });
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("API エラー時に error がエラーメッセージ文字列にセットされ isLoading=false になる", async () => {
    const apiError = new Error("Internal Server Error");
    vi.mocked(createGroup).mockRejectedValueOnce(apiError);

    const { result } = renderHook(() => useCreateGroup());

    await act(async () => {
      await result.current.submit({ name: "Test Group", description: "desc" });
    });

    expect(result.current.error).toBe(String(apiError));
    expect(result.current.isLoading).toBe(false);
    expect(mockNavigate).not.toHaveBeenCalled();
  });

  it("API 成功時に navigate が呼ばれる", async () => {
    vi.mocked(createGroup).mockResolvedValueOnce({
      id: 42,
      name: "Test Group",
      description: "desc",
      member_count: 0,
    });

    const { result } = renderHook(() => useCreateGroup());

    await act(async () => {
      await result.current.submit({ name: "Test Group", description: "desc" });
    });

    expect(prependGroupToGroupListCache).toHaveBeenCalledWith({
      id: 42,
      name: "Test Group",
      description: "desc",
      member_count: 0,
    });
    expect(mockNavigate).toHaveBeenCalledWith("/groups/42");
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});
