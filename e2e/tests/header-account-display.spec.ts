import { test, expect } from "@playwright/test";

test.describe("ヘッダーアカウント表示", () => {
  // TC-1: ログイン後、Header にアカウントアイコンが表示される
  test("TC-1: ログイン後、Header にアカウントアイコンが表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("button", { name: "Account" })).toBeVisible();
  });

  // TC-2: アイコンをクリックするとドロップダウンが開く
  test("TC-2: アイコンをクリックするとドロップダウンが開く", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByText("00000000-0000-0000-0000-000000000001")).toBeVisible();
  });

  // TC-3: ドロップダウンに UUID（フル形式）が表示される
  test("TC-3: ドロップダウンに UUID（フル形式）が表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByText("00000000-0000-0000-0000-000000000001")).toBeVisible();
  });

  // TC-4: ドロップダウンにユーザー名（firstName + " " + lastName）が表示される
  test("TC-4: ドロップダウンにユーザー名（firstName + lastName）が表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByText("Taro Yamada")).toBeVisible();
  });

  // TC-5: 「HR」テキストが Header に表示されない
  test("TC-5: 「HR」テキストが Header に表示されない", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("header").getByText("HR", { exact: true })).not.toBeVisible();
  });

  // TC-6: Escape キーでドロップダウンが閉じる
  test("TC-6: Escape キーでドロップダウンが閉じる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.getByRole("button", { name: "Account" }).click();
    await expect(page.getByText("00000000-0000-0000-0000-000000000001")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText("00000000-0000-0000-0000-000000000001")).not.toBeVisible();
  });
});
