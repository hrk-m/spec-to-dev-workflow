import { test, expect } from "@playwright/test";

/** Open the sidebar via the hamburger button */
async function openSidebar(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(page.getByRole("navigation", { name: "サイドバーナビゲーション" })).toBeVisible();
}

test.describe("サイドバーナビゲーション", () => {
  test("A: サイドバーの Groups クリックでサイドバーが閉じて / のグループ一覧に遷移する", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await openSidebar(page);

    // Click Groups button
    await page.getByRole("navigation", { name: "サイドバーナビゲーション" })
      .getByRole("button", { name: /Groups/ })
      .click();

    // Sidebar should close
    await expect(page.getByRole("navigation", { name: "サイドバーナビゲーション" })).not.toBeVisible({ timeout: 3000 });

    // URL should be /
    expect(page.url()).toMatch(/\/$|\/$/);

    // Group list should be visible
    await expect(page.getByPlaceholder("Search by name or description")).toBeVisible();
  });

  test("B: /groups/:id フルページ表示中にサイドバーの Groups クリックで / に戻れる", async ({ page }) => {
    await page.goto("/groups/1");
    await page.waitForLoadState("networkidle");

    // Confirm we're on the full-page group detail
    await expect(page.getByText("Group 001", { exact: true })).toBeVisible();
    await expect(page.getByRole("dialog")).toHaveCount(0);

    await openSidebar(page);

    // Click Groups button
    await page.getByRole("navigation", { name: "サイドバーナビゲーション" })
      .getByRole("button", { name: /Groups/ })
      .click();

    // Sidebar should close
    await expect(page.getByRole("navigation", { name: "サイドバーナビゲーション" })).not.toBeVisible({ timeout: 3000 });

    // URL should be /
    expect(page.url()).toMatch(/\/$|\/$/);

    // Group list (search box) should be visible
    await expect(page.getByPlaceholder("Search by name or description")).toBeVisible();
  });

  test("C: / にいる状態でサイドバーの Groups クリックしても正常に動作する（エラーなし）", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await openSidebar(page);

    // Click Groups button while already on /
    await page.getByRole("navigation", { name: "サイドバーナビゲーション" })
      .getByRole("button", { name: /Groups/ })
      .click();

    // Sidebar should close without error
    await expect(page.getByRole("navigation", { name: "サイドバーナビゲーション" })).not.toBeVisible({ timeout: 3000 });

    // Still on / with no errors
    expect(page.url()).toMatch(/\/$|\/$/);
    await expect(page.getByPlaceholder("Search by name or description")).toBeVisible();
  });

  test("D: サイドバーをオーバーレイクリックで閉じても URL は変わらない（リグレッション）", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await openSidebar(page);

    const urlBefore = page.url();

    // Click the overlay (not the Groups button)
    await page.getByTestId("sidebar-overlay").click({ force: true });

    // Sidebar should close
    await expect(page.getByRole("navigation", { name: "サイドバーナビゲーション" })).not.toBeVisible({ timeout: 3000 });

    // URL should NOT have changed
    expect(page.url()).toBe(urlBefore);
  });
});
