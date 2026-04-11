import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { updateGroup } from "@/pages/group-detail/api/update-group";
import { useUpdateGroup } from "@/pages/group-detail/model/useUpdateGroup";

vi.mock("@/pages/group-detail/api/update-group", () => ({
  updateGroup: vi.fn(),
}));

describe("useUpdateGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("デフォルト状態（isLoading=false, error=null）", () => {
    const { result } = renderHook(() => useUpdateGroup(1));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submit 後 isLoading=true になる", () => {
    vi.mocked(updateGroup).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useUpdateGroup(1));

    act(() => {
      void result.current.submit({ name: "test-group", description: "desc" });
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("API 成功時に onSuccess コールバックが呼ばれる", async () => {
    const mockGroup = {
      id: 1,
      name: "updated-group",
      description: "updated desc",
      member_count: 5,
    };
    vi.mocked(updateGroup).mockResolvedValueOnce(mockGroup);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useUpdateGroup(1, onSuccess));

    await act(async () => {
      await result.current.submit({ name: "updated-group", description: "updated desc" });
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });
});
