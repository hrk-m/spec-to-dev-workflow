import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("shared/config/env", () => {
  const ORIGINAL_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...ORIGINAL_ENV };
  });

  afterEach(() => {
    process.env = ORIGINAL_ENV;
  });

  it("環境変数が未設定の場合はデフォルト URL を返す", async () => {
    delete process.env["BUN_PUBLIC_API_URL"];
    const { API_BASE_URL } = await import("@/shared/config/env");
    expect(API_BASE_URL).toBe("http://localhost:8080");
  });

  it("BUN_PUBLIC_API_URL が設定されている場合はその値を返す", async () => {
    process.env["BUN_PUBLIC_API_URL"] = "http://api.example.com";
    const { API_BASE_URL } = await import("@/shared/config/env");
    expect(API_BASE_URL).toBe("http://api.example.com");
  });
});
