import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, HttpError } from "@/shared/api";

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

  it("エラーレスポンス時は HttpError をスローする", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 404, statusText: "Not Found" }),
    );

    await expect(apiFetch("/not-found")).rejects.toThrow("404 Not Found");
  });

  it("401 レスポンス時は HttpError.status === 401 で判別できる", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(
      new Response(null, { status: 401, statusText: "Unauthorized" }),
    );

    try {
      await apiFetch("/protected");
      expect.fail("should have thrown");
    } catch (err) {
      expect(err).toBeInstanceOf(HttpError);
      expect((err as HttpError).status).toBe(401);
    }
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

  it("204 No Content レスポンス時は undefined を返す", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 204 }));

    const result = await apiFetch<void>("/delete-endpoint");
    expect(result).toBeUndefined();
  });
});
