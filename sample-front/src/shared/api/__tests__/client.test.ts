import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch } from "@/shared/api/client";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  it("正常レスポンス時は JSON をパースして返す", async () => {
    const mockData = { message: "hello" };
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(mockData), { status: 200 }));

    const result = await apiFetch<{ message: string }>("/hello");
    expect(result).toEqual(mockData);
  });

  it("エラーレスポンス時は Error をスローする", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(apiFetch("/not-found")).rejects.toThrow("404 Not Found");
  });

  it("正しい URL でリクエストする", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    await apiFetch("/test-path");

    expect(fetch).toHaveBeenCalledWith(expect.stringContaining("/test-path"), undefined);
  });

  it("RequestInit オプションを fetch に渡す", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({}), { status: 200 }));

    const init: RequestInit = { method: "POST", body: JSON.stringify({ key: "value" }) };
    await apiFetch("/post-endpoint", init);

    expect(fetch).toHaveBeenCalledWith(expect.any(String), init);
  });
});
