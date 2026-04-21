import { test, expect } from "@playwright/test";

test.describe("グループ一覧ページ", () => {
  test("ページ見出しとグループカードが 1 件以上表示される", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const heading = page.getByRole("heading", { name: "Groups", level: 1 });
    await expect(heading).toBeVisible();

    const rows = page.locator('tbody tr');
    await expect(rows.first()).toBeVisible();
    expect(await rows.count()).toBeGreaterThanOrEqual(1);
  });

  test("カードをクリックするとグループ詳細ページに遷移する", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    await page
      .locator('tbody tr')
      .filter({ hasText: /Group \d+/ })
      .first()
      .click();
    await page.waitForURL(/\/groups\/\d+/);

    expect(page.url()).toMatch(/\/groups\/\d+/);
  });

  test("検索キーワードでグループを絞り込める", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const allRows = await page.locator('tbody tr').count();

    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("Group 001");

    // Wait for filtering to take effect
    await page.waitForTimeout(500);

    const filteredRows = await page.locator('tbody tr').count();
    expect(filteredRows).toBeLessThanOrEqual(allRows);
    expect(filteredRows).toBeGreaterThanOrEqual(1);
  });

  test("全 30 グループが初期表示に含まれる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // DISPLAY_STEP=50 shows first 50 items; seed has 30 groups → all visible without scrolling
    const groupRows = page.locator('tbody tr').filter({ hasText: /Group \d+/ });
    await expect(groupRows.first()).toBeVisible();
    const count = await groupRows.count();
    expect(count).toBe(30);
  });

  test("ページネーション UI（Previous/Next・ページサイズセレクタ）が DOM に存在しない", async ({
    page,
  }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Previous/Next pagination buttons must be absent
    expect(await page.getByRole("button", { name: /Previous/ }).count()).toBe(0);
    expect(await page.getByRole("button", { name: /Next/ }).count()).toBe(0);

    // Page-size selector buttons (20/50/100) must be absent
    expect(
      await page.getByRole("button", { name: "20", exact: true }).count(),
    ).toBe(0);
    expect(
      await page.getByRole("button", { name: "50", exact: true }).count(),
    ).toBe(0);
    expect(
      await page.getByRole("button", { name: "100", exact: true }).count(),
    ).toBe(0);
  });

  test("検索入力をクリアすると全件が再表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name or description");

    // First filter to reduce results
    await searchBox.fill("Group 001");
    await page.waitForTimeout(500);

    const filteredCount = await page
      .locator('tbody tr')
      .filter({ hasText: /Group \d+/ })
      .count();
    expect(filteredCount).toBeGreaterThanOrEqual(1);

    // Clear the search
    await searchBox.clear();
    await page.waitForTimeout(500);

    // Should show the default page of groups again
    await expect(page.getByText("30 groups", { exact: true })).toBeVisible();
  });

  test("存在しないキーワードで検索すると 0 件になる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("ZZZZNONEXISTENT");

    // Wait for filtering to take effect
    await page.waitForTimeout(500);

    // Should show the empty state message
    await expect(
      page.getByText("No groups matched that search."),
    ).toBeVisible();
  });

  test("total が 30 件以上と表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The subtitle shows "{total} groups"
    await expect(page.getByText("30 groups", { exact: true })).toBeVisible();
  });

  test("ページが 5 秒以内にコンテンツを表示する", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/");

    // Wait for at least one group card to appear (max 5 seconds)
    await expect(
      page.locator('tbody tr').filter({ hasText: /Group \d+/ }).first(),
    ).toBeVisible({
      timeout: 5000,
    });

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeLessThan(5000);
  });

  test("検索 0 件時にヘッダーラベルが「No groups found」に変わる", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const searchBox = page.getByPlaceholder("Search by name or description");
    await searchBox.fill("ZZZZNONEXISTENT");
    await page.waitForTimeout(500);
    await expect(page.getByText("No groups found")).toBeVisible();
  });

  test("API が 500 エラーを返した場合にエラー UI が表示される", async ({
    page,
  }) => {
    // Intercept the groups API and return 500
    await page.route("**/api/v1/groups*", (route) =>
      route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ message: "internal server error" }),
      }),
    );

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The GroupList component shows "Couldn't load groups" when error occurs with no cached groups
    await expect(page.getByText("Couldn't load groups")).toBeVisible();
  });

  test("グループ一覧リクエストに limit=100 が含まれる", async ({ page }) => {
    const capturedUrls: string[] = [];

    // Intercept and capture all groups API requests
    await page.route("**/api/v1/groups*", async (route) => {
      capturedUrls.push(route.request().url());
      await route.continue();
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // At least one request should have been made
    expect(capturedUrls.length).toBeGreaterThanOrEqual(1);

    // All requests should include limit=100
    for (const url of capturedUrls) {
      expect(url).toContain("limit=100");
    }
  });

  test("グループ一覧テーブルに ID/グループ名/説明/メンバー数 の 4 列ヘッダーが表示される", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // 4列ヘッダーが columnheader ロールで取得できること
    await expect(page.getByRole("columnheader", { name: "ID" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "グループ名" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "説明" })).toBeVisible();
    await expect(page.getByRole("columnheader", { name: "メンバー数" })).toBeVisible();
  });

  test("グループ一覧: 追加フェッチ失敗時にインラインエラーが表示され既存グループが維持される", async ({
    page,
  }) => {
    let requestCount = 0;

    // Generate 100 mock groups (makes lastBatchSize === 100 → triggers fetch more)
    const mockGroups = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      name: `Mock Group ${String(i + 1).padStart(3, "0")}`,
      description: `Description ${i + 1}`,
      member_count: 0,
    }));

    await page.route("**/api/v1/groups*", async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First fetch: return 100 groups → sets lastBatchSize === 100
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ groups: mockGroups, total: 100 }),
        });
      } else {
        // Additional fetch: return 500 → sets fetchMoreError
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ message: "internal server error" }),
        });
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Verify initial groups are displayed
    await expect(
      page.locator('tbody tr').filter({ hasText: /Mock Group 001/ }).first(),
    ).toBeVisible();

    // Scroll to bottom to trigger IntersectionObserver sentinel
    await page.evaluate(() =>
      window.scrollTo(0, document.body.scrollHeight),
    );

    // Wait for the second request to fail and fetchMoreError to appear
    // fetchMoreError is rendered inside a Callout.Root
    await expect(
      page.getByText(/500|internal server error/i),
    ).toBeVisible({ timeout: 5000 });

    // Existing groups must still be visible after fetch more error
    await expect(
      page.locator('tbody tr').filter({ hasText: /Mock Group 001/ }).first(),
    ).toBeVisible();
  });
});
