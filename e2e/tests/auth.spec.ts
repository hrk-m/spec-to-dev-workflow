import { test, expect } from "@playwright/test";

test.describe("認証基盤 (ProtectedRoute / ServiceUnavailablePage)", () => {
  // T1: 有効な DEV_USER_UUID で / にアクセスすると ProtectedRoute を通過してコンテンツが表示される
  test("T1: 有効な認証設定で / にアクセスするとホームコンテンツが表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // ProtectedRoute を通過してコンテンツが表示される
    // グループ検索ボックスが表示されればホームページが描画されている
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible();
  });

  // T2: /service-unavailable を直接開くと API が正常なら / へリダイレクトされる
  test("T2: /service-unavailable を直接開くと API 正常時に / へリダイレクトされる", async ({ page }) => {
    await page.goto("/service-unavailable");
    await page.waitForLoadState("networkidle");

    // API が正常に応答するため / へリダイレクトされる
    await page.waitForURL(/\/$|\/#/);
    expect(page.url()).toMatch(/\/$|\/#/);

    // ホームページコンテンツが表示される
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible();
  });

  // T3: GET /api/v1/me が失敗するとき保護ルートから /service-unavailable へリダイレクトされる
  test("T3: GET /api/v1/me 失敗時に /service-unavailable へリダイレクトされる", async ({ page }) => {
    // /api/v1/me をインターセプトして失敗させる
    await page.route("**/api/v1/me", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "service unavailable" }),
      }),
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // /service-unavailable へリダイレクトされる
    await page.waitForURL(/\/service-unavailable/);
    expect(page.url()).toMatch(/\/service-unavailable/);
  });

  // T4: /service-unavailable で API 失敗が続くとメンテナンス画面が表示される
  test("T4: /service-unavailable で API 失敗が続くとメンテナンス画面が表示される", async ({ page }) => {
    // /api/v1/me をインターセプトして失敗させる
    await page.route("**/api/v1/me", (route) =>
      route.fulfill({
        status: 503,
        contentType: "application/json",
        body: JSON.stringify({ message: "service unavailable" }),
      }),
    );

    await page.goto("/service-unavailable");
    await page.waitForLoadState("networkidle");

    // メンテナンス画面が表示される
    await expect(page.getByText("ただいまメンテナンス中です。")).toBeVisible();
    await expect(
      page.getByText("ご迷惑をおかけし申し訳ありません。しばらくしてから再度アクセスしてください。"),
    ).toBeVisible();
  });
});
