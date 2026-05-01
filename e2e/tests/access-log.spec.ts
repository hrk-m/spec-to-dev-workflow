import { test, expect } from "@playwright/test";

test.describe("アクセスログ (FE プロキシ ヘッダー制御)", () => {
  // AC-1: FE プロキシが x-login-user ヘッダーをブラウザに渡さない
  test("AC-1: /api/v1/me のレスポンスに x-login-user ヘッダーが含まれない", async ({
    page,
  }) => {
    let meResponseHeaders: Record<string, string> | null = null;

    page.on("response", (response) => {
      if (response.url().includes("/api/v1/me")) {
        meResponseHeaders = response.headers();
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    expect(meResponseHeaders).not.toBeNull();
    expect(meResponseHeaders!["x-login-user"]).toBeUndefined();
  });
});
