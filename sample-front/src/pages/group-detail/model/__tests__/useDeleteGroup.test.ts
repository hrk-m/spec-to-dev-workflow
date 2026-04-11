import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteGroup } from "@/pages/group-detail/api/delete-group";
import { useDeleteGroup } from "@/pages/group-detail/model/useDeleteGroup";

vi.mock("@/pages/group-detail/api/delete-group", () => ({
  deleteGroup: vi.fn(),
}));

describe("useDeleteGroup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("デフォルト状態（isLoading=false, error=null）", () => {
    const { result } = renderHook(() => useDeleteGroup({ onSuccess: vi.fn() }));

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("submit 後 isLoading=true になる", () => {
    vi.mocked(deleteGroup).mockReturnValue(new Promise(() => {}));

    const { result } = renderHook(() => useDeleteGroup({ onSuccess: vi.fn() }));

    act(() => {
      void result.current.submit(1);
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("API 成功時に onSuccess コールバックが呼ばれる", async () => {
    vi.mocked(deleteGroup).mockResolvedValueOnce(undefined);

    const onSuccess = vi.fn();
    const { result } = renderHook(() => useDeleteGroup({ onSuccess }));

    await act(async () => {
      await result.current.submit(1);
    });

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalledOnce();
    });
  });
});
