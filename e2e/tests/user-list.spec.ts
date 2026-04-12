import { test, expect } from "@playwright/test";

/** Open the sidebar via the hamburger button */
async function openSidebar(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Open navigation" }).click();
  await expect(
    page.getByRole("navigation", { name: "サイドバーナビゲーション" }),
  ).toBeVisible();
}

test.describe("ユーザー一覧ページ", () => {
  // T1: サイドバーの Users クリックで /users に遷移しユーザー一覧が表示される
  test("T1: サイドバーの Users クリックで /users に遷移しユーザー一覧が表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await openSidebar(page);

    // Click Users button in sidebar
    await page
      .getByRole("navigation", { name: "サイドバーナビゲーション" })
      .getByRole("button", { name: /Users/ })
      .click();

    // Sidebar should close
    await expect(
      page.getByRole("navigation", { name: "サイドバーナビゲーション" }),
    ).not.toBeVisible({ timeout: 3000 });

    // URL should be /users
    await page.waitForURL(/\/users/);
    expect(page.url()).toMatch(/\/users/);

    // User list content should be visible
    await expect(
      page.getByRole("heading", { name: "Users", level: 1 }),
    ).toBeVisible();
  });

  // T2: /users を直接開くと "Users" 見出しとユーザー名が表示される
  test("T2: /users を直接開くと Users 見出しとユーザー名が表示される", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    await expect(
      page.getByRole("heading", { name: "Users", level: 1 }),
    ).toBeVisible();

    // At least one user name should be visible (Taro Yamada → "Yamada Taro" format)
    await expect(page.getByText("Taro", { exact: false }).first()).toBeVisible();
  });

  // T3: seed の 15 件が取得され "15 users" がヘッダーに表示される
  test("T3: seed の 15 件が取得され 15 users がヘッダーに表示される", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    await expect(page.getByText("15 users", { exact: true })).toBeVisible();
  });

  // T4: キーワード "Yamada" で検索すると Taro Yamada が表示される
  test("T4: キーワード Yamada で検索すると Taro Yamada が表示される", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name");
    await searchBox.fill("Yamada");

    // Wait for debounce (300ms) + render
    await page.waitForTimeout(500);

    // Taro Yamada should be visible
    await expect(page.getByText(/Yamada|Taro/).first()).toBeVisible();

    // Should show fewer than 15 results
    const userCount = await page.getByText("15 users").count();
    expect(userCount).toBe(0);
  });

  // T5: 検索をクリアすると全 15 件が再表示される
  test("T5: 検索をクリアすると全 15 件が再表示される", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name");
    await searchBox.fill("Yamada");
    await page.waitForTimeout(500);

    // Clear the search input
    await searchBox.clear();
    await page.waitForTimeout(500);

    // All 15 users should be visible again
    await expect(page.getByText("15 users", { exact: true })).toBeVisible();
  });

  // T6: 存在しないキーワードで検索すると "No users found" が表示されページネーションが非表示になる
  test("T6: 存在しないキーワードで検索すると No users found が表示されページネーションが非表示になる", async ({
    page,
  }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name");
    await searchBox.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);

    await expect(page.getByText("No users found")).toBeVisible();

    // Pagination buttons should not be visible
    expect(
      await page.getByRole("button", { name: /Previous/ }).count(),
    ).toBe(0);
    expect(await page.getByRole("button", { name: /Next/ }).count()).toBe(0);
  });

  // T7: /users から Groups クリックで / に戻れる
  test("T7: /users から Groups クリックで / に戻れる", async ({ page }) => {
    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    await openSidebar(page);

    // Click Groups button
    await page
      .getByRole("navigation", { name: "サイドバーナビゲーション" })
      .getByRole("button", { name: /Groups/ })
      .click();

    // Sidebar should close
    await expect(
      page.getByRole("navigation", { name: "サイドバーナビゲーション" }),
    ).not.toBeVisible({ timeout: 3000 });

    // URL should be /
    await page.waitForURL(/\/$|\//);
    expect(page.url()).toMatch(/\/$|\//);

    // Group list should be visible
    await expect(
      page.getByPlaceholder("Search by name or description"),
    ).toBeVisible();
  });

  // T8: /api/v1/users が 500 を返した場合エラーメッセージが表示される
  test("T8: /api/v1/users が 500 を返した場合エラーメッセージが表示される", async ({
    page,
  }) => {
    // Intercept users API and return 500
    await page.route("**/api/v1/users*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "internal server error" }),
      }),
    );

    await page.goto("/users");
    await page.waitForLoadState("networkidle");

    // The UserList component shows "Couldn't load users" when error occurs with no cached users
    await expect(page.getByText("Couldn't load users")).toBeVisible();
  });
});
