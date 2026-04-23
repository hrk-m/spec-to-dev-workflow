import { test, expect } from "@playwright/test";

test.describe("ユーザー詳細ページ", () => {
  // T1: /users のテーブル行クリックで /users/1 へ遷移し詳細が表示される
  test("T1: /users のテーブル行クリックで /users/1 へ遷移し詳細が表示される", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // Click the first tbody row (UserTableRow with cursor:pointer)
    await page.locator("tbody tr").first().click();

    // Should navigate to /users/1
    await page.waitForURL(/\/users\/\d+/);
    expect(page.url()).toMatch(/\/users\/1/);

    // User detail should be visible
    await expect(page.getByText("00000000-0000-0000-0000-000000000001")).toBeVisible();
    await expect(page.getByText("Yamada", { exact: false })).toBeVisible();
    await expect(page.getByText("Taro", { exact: false })).toBeVisible();
  });

  // T2: /users/1 を直接開くと id / uuid / 姓名が表示される
  test("T2: /users/1 を直接開くと id / uuid / 姓名が表示される", async ({ page }) => {
    await page.goto("/users/1");
    await page.waitForLoadState("networkidle");

    // id=1 should be visible
    await expect(page.getByText("1", { exact: true }).first()).toBeVisible();
    // UUID
    await expect(page.getByText("00000000-0000-0000-0000-000000000001")).toBeVisible();
    // 姓名
    await expect(page.getByText("Yamada", { exact: false })).toBeVisible();
    await expect(page.getByText("Taro", { exact: false })).toBeVisible();
  });

  // T3: 「戻る」ボタンクリックで /users へ遷移する
  test("T3: 戻るボタンクリックで /users へ遷移する", async ({ page }) => {
    await page.goto("/users/1");
    await page.waitForLoadState("networkidle");

    await page.getByTestId("back-button").click();

    await page.waitForURL(/\/users$/);
    expect(page.url()).toMatch(/\/users$/);
  });

  // T4: ローディング中にスケルトンが表示される
  test("T4: ローディング中にスケルトン（user-detail-skeleton）が表示される", async ({ page }) => {
    // Delay the API response to observe loading state
    await page.route("**/api/v1/users/1", async (route) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 3000));
      await route.continue();
    });

    // Navigate without waiting for network idle
    await page.goto("/users/1");

    // Skeleton should be visible before the delayed response completes
    await expect(page.getByTestId("user-detail-skeleton")).toBeVisible();
  });

  // T5: 存在しない ID で「ユーザーが見つかりません」が表示される
  test("T5: 存在しない ID（/users/99999）で「ユーザーが見つかりません」が表示される", async ({ page }) => {
    await page.goto("/users/99999");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("ユーザーが見つかりません")).toBeVisible();
  });

  // T6: API が 500 を返した場合エラーカードが表示される
  test("T6: /api/v1/users/* が 500 を返した場合エラーカードが表示される", async ({ page }) => {
    await page.route("**/api/v1/users/*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "internal server error" }),
      })
    );

    await page.goto("/users/1");
    await page.waitForLoadState("networkidle");

    await expect(page.getByTestId("user-detail-error")).toBeVisible();
  });
});
